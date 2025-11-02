using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SolanaPvP.EF_Core.DBOs;

[Table("RandomnessPool")]
public class RandomnessPoolDBO
{
    [Key]
    public string AccountPubkey { get; set; } = string.Empty;
    
    public int Status { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime? LastUsedAt { get; set; }
    
    public DateTime? CooldownUntil { get; set; }
}

