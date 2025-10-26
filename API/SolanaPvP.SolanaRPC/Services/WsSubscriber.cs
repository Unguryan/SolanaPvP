using System.Net.WebSockets;
using System.Text;
using Newtonsoft.Json;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Settings;
using SolanaPvP.SolanaRPC.Internal.Models;

namespace SolanaPvP.SolanaRPC.Services;

public class WsSubscriber : IWsSubscriber, IDisposable
{
    private readonly SolanaSettings _solanaSettings;
    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _cancellationTokenSource;
    private Task? _receiveTask;
    private bool _disposed = false;

    public bool IsConnected => _webSocket?.State == WebSocketState.Open;

    public WsSubscriber(SolanaSettings solanaSettings)
    {
        _solanaSettings = solanaSettings;
    }

    public async Task SubscribeLogsAsync(string programId, Action<WsLogEvent> onEvent, CancellationToken cancellationToken)
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

    private async Task ReceiveMessagesAsync(Action<WsLogEvent> onEvent, CancellationToken cancellationToken)
    {
        var buffer = new byte[4096];
        
        while (!cancellationToken.IsCancellationRequested && _webSocket?.State == WebSocketState.Open)
        {
            try
            {
                var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);
                
                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    var wsLogEvent = ParseWebSocketMessage(message);
                    if (wsLogEvent != null)
                    {
                        onEvent(wsLogEvent);
                    }
                }
                else if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception)
            {
                // Handle receive errors and attempt reconnection
                await ReconnectWithBackoffAsync(string.Empty, onEvent, cancellationToken);
                break;
            }
        }
    }

    private WsLogEvent? ParseWebSocketMessage(string message)
    {
        try
        {
            var response = JsonConvert.DeserializeObject<dynamic>(message);
            if (response?.result?.value == null) return null;

            var value = response.result.value;
            return new WsLogEvent
            {
                Signature = value.signature?.ToString() ?? string.Empty,
                Slot = value.slot?.ToObject<long>() ?? 0,
                Logs = value.logs?.ToObject<List<string>>() ?? new List<string>(),
                Error = value.err?.ToString()
            };
        }
        catch (Exception)
        {
            return null;
        }
    }

    private async Task ReconnectWithBackoffAsync(string programId, Action<WsLogEvent> onEvent, CancellationToken cancellationToken)
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
