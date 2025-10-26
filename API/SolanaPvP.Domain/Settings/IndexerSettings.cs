namespace SolanaPvP.Domain.Settings;

public class IndexerSettings
{
    public long StartSlot { get; set; } = 0;
    public int BackfillBatch { get; set; } = 100;
}
