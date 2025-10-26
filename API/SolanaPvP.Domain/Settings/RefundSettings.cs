namespace SolanaPvP.Domain.Settings;

public class RefundSettings
{
    public int CheckPeriodSeconds { get; set; } = 15;
    public int BatchSize { get; set; } = 50;
}
