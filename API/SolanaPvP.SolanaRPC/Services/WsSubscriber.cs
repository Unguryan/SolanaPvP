using System.Net.WebSockets;
using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Settings;
using SolanaPvP.SolanaRPC.Internal.Models;

namespace SolanaPvP.SolanaRPC.Services;

public class WsSubscriber : IWsSubscriber, IDisposable
{
    private readonly SolanaSettings _solanaSettings;
    private readonly ILogger<WsSubscriber> _logger;
    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _cancellationTokenSource;
    private Task? _receiveTask;
    private bool _disposed = false;

    public bool IsConnected => _webSocket?.State == WebSocketState.Open;

    public WsSubscriber(SolanaSettings solanaSettings, ILogger<WsSubscriber> logger)
    {
        _solanaSettings = solanaSettings;
        _logger = logger;
    }

    public async Task SubscribeLogsAsync(string programId, Action<SolanaPvP.Application.Interfaces.SolanaRPC.WsLogEvent> onEvent, CancellationToken cancellationToken)
    {
        _cancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        
        try
        {
            await ConnectAsync();
            await SubscribeToLogsAsync(programId);
            _receiveTask = ReceiveMessagesAsync(onEvent, _cancellationTokenSource.Token);
        }
        catch (Exception)
        {
            // Handle connection errors
            await ReconnectWithBackoffAsync(programId, onEvent, cancellationToken);
        }
    }

    private async Task ConnectAsync()
    {
        _webSocket = new ClientWebSocket();
        await _webSocket.ConnectAsync(new Uri(_solanaSettings.WsUrl), CancellationToken.None);
    }

    private async Task SubscribeToLogsAsync(string programId)
    {
        if (_webSocket?.State != WebSocketState.Open) return;

        var subscribeRequest = new
        {
            jsonrpc = "2.0",
            id = 1,
            method = "logsSubscribe",
            @params = new object[]
            {
                new
                {
                    mentions = new[] { programId }
                },
                new
                {
                    commitment = "confirmed"
                }
            }
        };

        var json = JsonConvert.SerializeObject(subscribeRequest);
        var bytes = Encoding.UTF8.GetBytes(json);
        await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
    }

    private async Task ReceiveMessagesAsync(Action<SolanaPvP.Application.Interfaces.SolanaRPC.WsLogEvent> onEvent, CancellationToken cancellationToken)
    {
        var buffer = new byte[8192]; // Increased buffer size for larger messages
        
        while (!cancellationToken.IsCancellationRequested && _webSocket?.State == WebSocketState.Open)
        {
            try
            {
                var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);
                
                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    _logger.LogDebug("[WS] Received message: {Message}", message);
                    
                    var wsLogEvent = ParseWebSocketMessage(message);
                    if (wsLogEvent != null)
                    {
                        _logger.LogDebug("[WS] Parsed event - Signature: {Signature}, Logs: {LogCount}", 
                            wsLogEvent.Signature, wsLogEvent.Logs?.Count ?? 0);
                        onEvent(wsLogEvent);
                    }
                    else
                    {
                        _logger.LogDebug("[WS] Message did not contain parseable log event");
                    }
                }
                else if (result.MessageType == WebSocketMessageType.Close)
                {
                    _logger.LogInformation("[WS] WebSocket closed by server");
                    break;
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("[WS] Receive operation cancelled");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[WS] Error receiving message, attempting reconnection");
                // Handle receive errors and attempt reconnection
                await ReconnectWithBackoffAsync(string.Empty, onEvent, cancellationToken);
                break;
            }
        }
    }

    private SolanaPvP.Application.Interfaces.SolanaRPC.WsLogEvent? ParseWebSocketMessage(string message)
    {
        try
        {
            var response = JsonConvert.DeserializeObject<dynamic>(message);
            
            // Check if this is a notification (not a subscription confirmation)
            if (response?.method != "logsNotification") return null;
            
            // Use indexer to access "params" (reserved keyword)
            dynamic paramsObj = response["params"];
            if (paramsObj?.result?.value == null) return null;

            var value = paramsObj.result.value;
            var context = paramsObj.result.context;
            
            return new SolanaPvP.Application.Interfaces.SolanaRPC.WsLogEvent
            {
                Signature = value.signature?.ToString() ?? string.Empty,
                Slot = context?.slot?.ToObject<long>() ?? 0,
                Logs = value.logs?.ToObject<List<string>>() ?? new List<string>(),
                Error = value.err?.ToString()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[WS] Error parsing WebSocket message: {Message}", message);
            return null;
        }
    }

    private async Task ReconnectWithBackoffAsync(string programId, Action<SolanaPvP.Application.Interfaces.SolanaRPC.WsLogEvent> onEvent, CancellationToken cancellationToken)
    {
        var delay = TimeSpan.FromSeconds(1);
        var maxDelay = TimeSpan.FromMinutes(5);

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(delay, cancellationToken);
                await ConnectAsync();
                await SubscribeToLogsAsync(programId);
                _receiveTask = ReceiveMessagesAsync(onEvent, cancellationToken);
                return; // Successfully reconnected
            }
            catch (Exception)
            {
                delay = TimeSpan.FromMilliseconds(Math.Min(delay.TotalMilliseconds * 2, maxDelay.TotalMilliseconds));
            }
        }
    }

    public async Task DisconnectAsync()
    {
        _cancellationTokenSource?.Cancel();
        
        if (_webSocket?.State == WebSocketState.Open)
        {
            await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Disconnecting", CancellationToken.None);
        }

        if (_receiveTask != null)
        {
            await _receiveTask;
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            DisconnectAsync().Wait(5000); // Wait up to 5 seconds for graceful shutdown
            _webSocket?.Dispose();
            _cancellationTokenSource?.Dispose();
            _disposed = true;
        }
    }
}
