namespace SolanaPvP.Domain.Enums;

public enum MatchStatus
{
    Waiting = 0,              // ждем второго игрока
    AwaitingRandomness = 1,   // joined, ждем VRF
    Resolved = 2,             // игра завершена, данные отправлены
    Refunded = 3              // возврат ставки
}
