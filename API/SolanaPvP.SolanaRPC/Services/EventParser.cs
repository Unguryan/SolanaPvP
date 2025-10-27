using Newtonsoft.Json;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Settings;
using SolanaPvP.SolanaRPC.Internal.Models;

namespace SolanaPvP.SolanaRPC.Services;

public class EventParser : IEventParser
{
    private readonly SolanaSettings _solanaSettings;

    public EventParser(SolanaSettings solanaSettings)
    {
        _solanaSettings = solanaSettings;
    }

    public bool IsOurProgram(string programId)
    {
        return programId == _solanaSettings.ProgramId;
    }

    public SolanaPvP.Application.Interfaces.SolanaRPC.ParsedEvent? ParseProgramLog(string logLine)
    {
        try
        {
            // This is a simplified parser - in reality, you'd need to parse Anchor event logs
            // The actual format depends on your Anchor program's event definitions
            
            if (logLine.Contains("Program log: AnchorEvent"))
            {
                // Extract the event data from the log line
                var eventData = ExtractEventData(logLine);
                if (eventData != null)
                {
                    return ParseAnchorEvent(eventData);
                }
            }

            return null;
        }
        catch (Exception)
        {
            // Log error but don't throw - we want to continue processing other events
            return null;
        }
    }

    private string? ExtractEventData(string logLine)
    {
        // This is a placeholder - actual implementation would depend on Anchor event format
        // Example: "Program log: AnchorEvent: {event_data}"
        var startIndex = logLine.IndexOf("AnchorEvent: ");
        if (startIndex == -1) return null;

        return logLine.Substring(startIndex + "AnchorEvent: ".Length);
    }

    private SolanaPvP.Application.Interfaces.SolanaRPC.ParsedEvent? ParseAnchorEvent(string eventData)
    {
        try
        {
            // This is a simplified example - you'd need to implement based on your actual Anchor events
            var eventObj = JsonConvert.DeserializeObject<dynamic>(eventData);
            
            if (eventObj?.eventType == null) return null;

            var eventType = eventObj.eventType.ToString();
            var matchPda = eventObj.matchPda?.ToString() ?? string.Empty;

            var kind = eventType switch
            {
                "MatchCreated" => EventKind.MatchCreated,
                "MatchJoined" => EventKind.MatchJoined,
                "MatchResolved" => EventKind.MatchResolved,
                "MatchRefunded" => EventKind.MatchRefunded,
                _ => (EventKind?)null
            };

            if (kind == null) return null;

            return new SolanaPvP.Application.Interfaces.SolanaRPC.ParsedEvent
            {
                Kind = kind.Value,
                MatchPda = matchPda,
                PayloadJson = eventData
            };
        }
        catch (Exception)
        {
            return null;
        }
    }
}
