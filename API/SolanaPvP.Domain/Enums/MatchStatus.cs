namespace SolanaPvP.Domain.Enums;

public enum MatchStatus
{
    Open = 0,              // lobby not full - открытое лобби, ждем игроков
    Pending = 1,           // lobby full, VRF pending - лобби заполнено, ждем VRF
    InProgress = 2,        // game started, numbers assigned - игра началась, числа назначены
    Resolved = 3,          // game complete - игра завершена
    Refunded = 4           // возврат ставки
}
