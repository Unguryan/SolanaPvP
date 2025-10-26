using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.DBOs;

namespace SolanaPvP.EF_Core.Mappers;

public static class EventMapper
{
    public static Event ToDomain(this EventDBO dbo)
    {
        return new Event
        {
            Id = dbo.Id,
            Signature = dbo.Signature,
            Slot = dbo.Slot,
            Kind = dbo.Kind,
            MatchPda = dbo.MatchPda,
            PayloadJson = dbo.PayloadJson,
            Ts = dbo.Ts
        };
    }

    public static EventDBO ToDBO(this Event domain)
    {
        return new EventDBO
        {
            Id = domain.Id,
            Signature = domain.Signature,
            Slot = domain.Slot,
            Kind = domain.Kind,
            MatchPda = domain.MatchPda,
            PayloadJson = domain.PayloadJson,
            Ts = domain.Ts
        };
    }
}
