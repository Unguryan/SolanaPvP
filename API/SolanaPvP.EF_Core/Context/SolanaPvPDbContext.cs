using Microsoft.EntityFrameworkCore;
using SolanaPvP.EF_Core.DBOs;

namespace SolanaPvP.EF_Core.Context;

public class SolanaPvPDbContext : DbContext
{
    public SolanaPvPDbContext(DbContextOptions<SolanaPvPDbContext> options) : base(options)
    {
    }

    public DbSet<MatchDBO> Matches { get; set; }
    public DbSet<MatchParticipantDBO> MatchParticipants { get; set; }
    public DbSet<GameDataDBO> GameData { get; set; }
    public DbSet<RefundTaskDBO> RefundTasks { get; set; }
    public DbSet<UserDBO> Users { get; set; }
    public DbSet<MatchInvitationDBO> MatchInvitations { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Match configuration
        modelBuilder.Entity<MatchDBO>(entity =>
        {
            entity.HasKey(e => e.MatchPda);
            entity.Property(e => e.MatchPda).HasMaxLength(44); // Base58 encoded PDA
            entity.Property(e => e.CreateTx).HasMaxLength(88).IsRequired();
            entity.Property(e => e.JoinTx).HasMaxLength(88);
            entity.Property(e => e.PayoutTx).HasMaxLength(88);
            
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.DeadlineTs);
            entity.HasIndex(e => e.IsPrivate);
            entity.HasIndex(e => e.InvitationId);
        });

        // MatchParticipant configuration
        modelBuilder.Entity<MatchParticipantDBO>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MatchPda).HasMaxLength(44).IsRequired();
            entity.Property(e => e.Pubkey).HasMaxLength(44).IsRequired();
            
            entity.HasIndex(e => e.MatchPda);
            entity.HasIndex(e => e.Pubkey);
            entity.HasIndex(e => new { e.MatchPda, e.Side });
            
            entity.HasOne(e => e.Match)
                .WithMany(m => m.Participants)
                .HasForeignKey(e => e.MatchPda)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.User)
                .WithMany(u => u.MatchParticipants)
                .HasForeignKey(e => e.Pubkey)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // GameData configuration
        modelBuilder.Entity<GameDataDBO>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MatchPda).HasMaxLength(44).IsRequired();
            
            entity.HasIndex(e => e.MatchPda).IsUnique();
            
            entity.HasOne(e => e.Match)
                .WithOne(m => m.GameData)
                .HasForeignKey<GameDataDBO>(e => e.MatchPda)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // RefundTask configuration
        modelBuilder.Entity<RefundTaskDBO>(entity =>
        {
            entity.HasKey(e => e.MatchPda);
            entity.Property(e => e.MatchPda).HasMaxLength(44);
            entity.Property(e => e.ExecutedTx).HasMaxLength(88);
            
            entity.HasIndex(e => e.DeadlineTs);
            entity.HasIndex(e => e.ScheduledAt);
        });

        // User configuration
        modelBuilder.Entity<UserDBO>(entity =>
        {
            entity.HasKey(e => e.Pubkey);
            entity.Property(e => e.Pubkey).HasMaxLength(44);
            entity.Property(e => e.Username).HasMaxLength(64).IsRequired();
            
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.FirstSeen);
            entity.HasIndex(e => e.LastSeen);
        });

        // MatchInvitation configuration
        modelBuilder.Entity<MatchInvitationDBO>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.InviterPubkey).HasMaxLength(44).IsRequired();
            entity.Property(e => e.InviteePubkey).HasMaxLength(44).IsRequired();
            entity.Property(e => e.MatchPda).HasMaxLength(44);
            
            entity.HasIndex(e => e.InviterPubkey);
            entity.HasIndex(e => e.InviteePubkey);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.ExpiresAt);
            
            entity.HasOne(e => e.Inviter)
                .WithMany(u => u.SentInvitations)
                .HasForeignKey(e => e.InviterPubkey)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Invitee)
                .WithMany(u => u.ReceivedInvitations)
                .HasForeignKey(e => e.InviteePubkey)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Match)
                .WithOne(m => m.Invitation)
                .HasForeignKey<MatchInvitationDBO>(e => e.MatchPda)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
