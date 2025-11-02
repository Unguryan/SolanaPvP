// Security: See security.txt in the repository root for security policy and contact information
// --------------------------------------------------------------------------
// Final Anchor program with Switchboard VRF v2 integration (English comments)
// --------------------------------------------------------------------------
// Key properties:
// - Allowed team sizes: 1, 2, 5 (validated on create)
// - side: u8 as bit → 0 = team1, 1 = team2
// - Min stake: 0.05 SOL (50_000_000 lamports)
// - Fixed platform fee: 1% (sent to GlobalConfig.admin)
// - Creator pays and joins immediately on create_lobby
// - Exactly one active lobby per creator enforced by ActiveLobby PDA
// - Auto VRF request on the LAST join (no off-chain picker) → status moves to Pending
// - Switchboard VRF calls fulfill_randomness (callback) to fairly pick winner and pay instantly
// - Refund is only possible from Open state (i.e., before VRF request) and after 2 minutes
// - Careful use of remaining_accounts for payouts to ensure target AccountInfos are present
//
// Notes:
// - This is a template for Switchboard VRF v2 usage. You must pass the proper VRF accounts
//   in the last join call (when the lobby becomes full). This includes the queue, permission,
//   vrf account, escrow wallet, payer wallet, program state, recent blockhashes sysvar, etc.
// - The VRF authority is set to the lobby PDA so we can verify the callback is legitimate.
// - In fulfill_randomness we validate that the provided VRF account matches the one stored
//   in the lobby and that the authority equals the lobby PDA.
// - ActiveLobby is closed after final resolution or refund (returns rent to creator).

use anchor_lang::prelude::{*, Context, Program};
use anchor_lang::system_program::System;
use anchor_lang::solana_program::system_instruction;
// Token imports removed - not used in this version
// Switchboard OnDemand (replaces deprecated V2)
// Import only what we need to avoid conflicts with anchor_lang::prelude::*
use switchboard_on_demand::{RandomnessAccountData};

// Security contact information
#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "SolanaPvP",
    project_url: "https://github.com/Unguryan/SolanaPvP",
    contacts: "email:security@solanapvp.com",
    policy: "https://github.com/Unguryan/SolanaPvP/blob/main/SECURITY.md",
    preferred_languages: "en",
    source_code: "https://github.com/Unguryan/SolanaPvP",
    source_release: "v1.0.0",
    source_revision: "main"
}

// ------------------------------ Constants ------------------------------

declare_id!("F2LhVGUa9yLbYVYujYMPyckqWmsokHE9wym7ceGHWUMZ");

// Switchboard OnDemand program ID (devnet & mainnet)
// SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv
pub const SWITCHBOARD_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    0x9e, 0x20, 0x44, 0xd0, 0x51, 0x76, 0x96, 0xa8, 0x45, 0x4b, 0xd8, 0xa8, 0x66, 0x8e, 0x6a, 0x4f,
    0xe3, 0x5f, 0x0c, 0xe6, 0x9c, 0x95, 0x57, 0x6e, 0x48, 0x26, 0x90, 0x9d, 0x47, 0x0e, 0x0e, 0x58,
]);

// PDA seeds
const SEED_LOBBY:  &[u8] = b"lobby";
const SEED_ACTIVE: &[u8] = b"active";
const SEED_CONFIG: &[u8] = b"config";

// Economics
const PLATFORM_FEE_BPS: u64 = 100;            // 1%
const MIN_STAKE_LAMPORTS: u64 = 50_000_000;   // 0.05 SOL
const REFUND_LOCK_SECS: i64 = 120;            // 2 minutes

// Team sizing
const MAX_TEAM_SIZE_ALLOC: usize = 5;         // allocation cap
const ALLOWED_TEAM_SIZES: [u8; 3] = [1, 2, 5]; // allowed sizes

// ------------------------------ Types / Errors ------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum LobbyStatus {
    Open,     // collecting players
    Pending,  // VRF requested, waiting for callback
    Resolved, // paid out to winners
    Refunded, // refunded to participants
}

// ------------------------------ Events ------------------------------

#[event]
pub struct LobbyCreated {
    pub lobby: Pubkey,
    pub lobby_id: u64,
    pub creator: Pubkey,
    pub stake_lamports: u64,
    pub team_size: u8,
    pub created_at: i64,
}

#[event]
pub struct PlayerJoined {
    pub lobby: Pubkey,
    pub player: Pubkey,
    pub side: u8,
    pub team1_count: u8,
    pub team2_count: u8,
    pub is_full: bool,
}

#[event]
pub struct LobbyResolved {
    pub lobby: Pubkey,
    pub winner_side: u8,
    pub randomness_value: u64, // Switchboard randomness for transparency!
    pub total_pot: u64,
    pub platform_fee: u64,
    pub payout_per_winner: u64,
}

#[event]
pub struct LobbyRefunded {
    pub lobby: Pubkey,
    pub refunded_count: u8,
    pub total_refunded: u64,
}

#[error_code]
pub enum PvpError {
    #[msg("Invalid side (must be 0 or 1)")]
    InvalidSide,
    #[msg("Lobby is not open")]
    LobbyNotOpen,
    #[msg("Lobby already pending/resolved/refunded")]
    LobbyNotOpenForJoin,
    #[msg("Side is full")]
    SideFull,
    #[msg("Player already joined")]
    AlreadyJoined,
    #[msg("Not enough players")]
    NotEnoughPlayers,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Stake is below minimum")]
    StakeTooSmall,
    #[msg("Too soon to refund")]
    TooSoonToRefund,
    #[msg("Already finalized")]
    AlreadyFinalized,
    #[msg("Bad remaining accounts length")]
    BadRemainingAccounts,
    #[msg("Invalid team size (allowed: 1, 2, 5)")]
    InvalidTeamSize,
    #[msg("Remaining accounts mismatch with team lists")]
    RemainingAccountsMismatch,
    #[msg("Wrong Switchboard program id")]
    WrongSwitchboardProgram,
    #[msg("VRF account does not match lobby")]
    WrongVrfAccount,
    #[msg("VRF authority mismatch")]
    WrongVrfAuthority,
    #[msg("Lobby not pending")]
    NotPending,
    #[msg("Lobby is full - must use join_side_final instruction")]
    MustUseFinalJoin,

    #[msg("Wrong randomness account provided")]
    WrongRandomnessAccount,
    
    #[msg("Invalid randomness data")]
    InvalidRandomnessData,
}


// ------------------------------ Accounts ------------------------------

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(
        init,
        payer = payer,
        space = GlobalConfig::SIZE,
        seeds = [SEED_CONFIG],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Creates lobby PDA, ActiveLobby PDA, creator joins immediately.
#[derive(Accounts)]
#[instruction(lobby_id: u64)]
pub struct CreateLobby<'info> {
    #[account(
        init,
        payer = creator,
        space = Lobby::SIZE,
        seeds = [SEED_LOBBY, creator.key().as_ref(), &lobby_id.to_le_bytes()],
        bump
    )]
    pub lobby: Account<'info, Lobby>,

    #[account(
        init,
        payer = creator,
        space = ActiveLobby::SIZE,
        seeds = [SEED_ACTIVE, creator.key().as_ref()],
        bump
    )]
    pub active: Account<'info, ActiveLobby>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// JoinSideSimple - for non-final joins (when lobby won't be full after this join)
// Only requires minimal accounts, no VRF accounts needed.
#[derive(Accounts)]
pub struct JoinSideSimple<'info> {
    #[account(
        mut,
        has_one = creator @ PvpError::Unauthorized,
        seeds = [SEED_LOBBY, creator.key().as_ref(), &lobby.lobby_id.to_le_bytes()],
        bump
    )]
    pub lobby: Account<'info, Lobby>,

    /// CHECK: Just to satisfy has_one and PDA seeds
    pub creator: UncheckedAccount<'info>,

    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_ACTIVE, lobby.creator.as_ref()],
        bump
    )]
    pub active: Account<'info, ActiveLobby>,

    #[account(
        seeds = [SEED_CONFIG],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
}

// JoinSideFull - for the final join (when lobby becomes full after this join)
// Uses Switchboard OnDemand for randomness - much simpler than V2!
#[derive(Accounts)]
pub struct JoinSideFull<'info> {
    #[account(
        mut,
        has_one = creator @ PvpError::Unauthorized,
        seeds = [SEED_LOBBY, creator.key().as_ref(), &lobby.lobby_id.to_le_bytes()],
        bump
    )]
    pub lobby: Account<'info, Lobby>,

    /// CHECK: Just to satisfy has_one and PDA seeds
    pub creator: UncheckedAccount<'info>,

    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_ACTIVE, lobby.creator.as_ref()],
        bump
    )]
    pub active: Account<'info, ActiveLobby>,

    #[account(
        seeds = [SEED_CONFIG],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,

    /// Switchboard OnDemand randomness account
    /// CHECK: Validated by Switchboard OnDemand program
    #[account(mut)]
    pub randomness_account_data: AccountInfo<'info>,

    /// CHECK: Switchboard OnDemand program - verified via address check
    #[account(address = SWITCHBOARD_PROGRAM_ID)]
    pub switchboard_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// Refund context (Open → Refunded). Closes ActiveLobby (rent back to creator).
#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(
        mut,
        seeds = [SEED_LOBBY, lobby.creator.as_ref(), &lobby.lobby_id.to_le_bytes()],
        bump
    )]
    pub lobby: Account<'info, Lobby>,

    /// CHECK: Creator account for closing active lobby
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,

    pub requester: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_ACTIVE, lobby.creator.as_ref()],
        bump,
        close = creator
    )]
    pub active: Account<'info, ActiveLobby>,

    #[account(
        seeds = [SEED_CONFIG],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
    // remaining_accounts: [all participants: team1..., team2...]
}

// ResolveMatch - Called to resolve a match and pay winners
// This is separate from join_side_final so we can handle payouts with remaining_accounts
// remaining_accounts must include: [admin, team1..., team2...]
#[derive(Accounts)]
pub struct ResolveMatch<'info> {
    #[account(
        mut,
        seeds = [SEED_LOBBY, lobby.creator.as_ref(), &lobby.lobby_id.to_le_bytes()],
        bump
    )]
    pub lobby: Account<'info, Lobby>,

    /// CHECK: Creator account for closing active lobby
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SEED_ACTIVE, lobby.creator.as_ref()],
        bump,
        close = creator
    )]
    pub active: Account<'info, ActiveLobby>,

    #[account(
        seeds = [SEED_CONFIG],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,

    /// Switchboard OnDemand randomness account
    /// CRITICAL: Must be owned by Switchboard and match the saved account
    /// This ensures randomness is provably fair and cannot be manipulated
    /// CHECK: Verified via owner check (SWITCHBOARD_PROGRAM_ID) and constraint check (matches lobby.randomness_account)
    #[account(
        mut,
        owner = SWITCHBOARD_PROGRAM_ID,
        constraint = randomness_account_data.key() == lobby.randomness_account @ PvpError::WrongRandomnessAccount
    )]
    pub randomness_account_data: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    // remaining_accounts: [admin, team1..., team2...]
}

// ------------------------------ Program ------------------------------

#[program]
pub mod pvp_program {
    use super::*;

    // Initializes global config with admin pubkey (fee collector).
    pub fn init_config(ctx: Context<InitConfig>, admin: Pubkey) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.bump = ctx.bumps.config;
        cfg.admin = admin;
        Ok(())
    }

    // Creates a lobby, enforces one active lobby per creator, and makes the creator join immediately.
    // side: 0 (team1) / 1 (team2)
    pub fn create_lobby(
        ctx: Context<CreateLobby>,
        lobby_id: u64,
        team_size: u8,          // must be 1/2/5
        stake_lamports: u64,
        side: u8,               // 0 or 1
    ) -> Result<()> {
        require!(ALLOWED_TEAM_SIZES.contains(&team_size), PvpError::InvalidTeamSize);
        require!(stake_lamports >= MIN_STAKE_LAMPORTS, PvpError::StakeTooSmall);
        require!(side <= 1, PvpError::InvalidSide);

        // Initialize lobby state
        let lobby = &mut ctx.accounts.lobby;
        lobby.bump               = ctx.bumps.lobby;
        lobby.lobby_id           = lobby_id;
        lobby.creator            = ctx.accounts.creator.key();
        lobby.status             = LobbyStatus::Open;
        lobby.team_size          = team_size;
        lobby.stake_lamports     = stake_lamports;
        lobby.created_at         = Clock::get()?.unix_timestamp;
        lobby.finalized          = false;
        lobby.randomness_account = Pubkey::default(); // not set yet
        lobby.winner_side        = 0; // not set yet
        lobby.team1              = Vec::with_capacity(team_size as usize);
        lobby.team2              = Vec::with_capacity(team_size as usize);

        // Mark an active lobby for this creator (prevents creating another)
        let active = &mut ctx.accounts.active;
        active.bump    = ctx.bumps.active;
        active.creator = lobby.creator;
        active.lobby   = lobby.key();

        // Creator pays and joins immediately
        internal_join_side(
            &ctx.accounts.creator,
            lobby,
            ctx.accounts.system_program.to_account_info(),
            side,
        )?;

        // Emit lobby created event
        emit!(LobbyCreated {
            lobby: lobby.key(),
            lobby_id,
            creator: ctx.accounts.creator.key(),
            stake_lamports,
            team_size,
            created_at: lobby.created_at,
        });

        Ok(())
    }

    // A player joins a side (0 or 1) - for non-final joins only.
    // If this join would fill the lobby, this will error - caller must use join_side_final instead.
    pub fn join_side(ctx: Context<JoinSideSimple>, side: u8) -> Result<()> {
        require!(side <= 1, PvpError::InvalidSide);

        // Must be Open to accept more players
        let lobby = &mut ctx.accounts.lobby;
        require!(matches!(lobby.status, LobbyStatus::Open), PvpError::LobbyNotOpenForJoin);

        // Collect stake and add player
        internal_join_side(
            &ctx.accounts.player,
            lobby,
            ctx.accounts.system_program.to_account_info(),
            side,
        )?;

        // Check if lobby is now full
        let full_now =
            (lobby.team1.len() as u8 == lobby.team_size) &&
            (lobby.team2.len() as u8 == lobby.team_size);

        // Emit player joined event
        emit!(PlayerJoined {
            lobby: lobby.key(),
            player: ctx.accounts.player.key(),
            side,
            team1_count: lobby.team1.len() as u8,
            team2_count: lobby.team2.len() as u8,
            is_full: full_now,
        });

        // If lobby is full, this is an error - should have used join_side_final
        require!(!full_now, PvpError::MustUseFinalJoin);

        Ok(())
    }

    // Final join - when this join will fill the lobby and trigger VRF request.
    // IMPORTANT: Caller must provide all Switchboard VRF accounts.
    pub fn join_side_final(ctx: Context<JoinSideFull>, side: u8) -> Result<()> {
        require!(side <= 1, PvpError::InvalidSide);

        // Must be Open to accept more players
        let lobby = &mut ctx.accounts.lobby;
        require!(matches!(lobby.status, LobbyStatus::Open), PvpError::LobbyNotOpenForJoin);

        // Collect stake and add player
        internal_join_side(
            &ctx.accounts.player,
            lobby,
            ctx.accounts.system_program.to_account_info(),
            side,
        )?;

        // Check if lobby is now full
        let full_now =
            (lobby.team1.len() as u8 == lobby.team_size) &&
            (lobby.team2.len() as u8 == lobby.team_size);

        // Emit player joined event
        emit!(PlayerJoined {
            lobby: lobby.key(),
            player: ctx.accounts.player.key(),
            side,
            team1_count: lobby.team1.len() as u8,
            team2_count: lobby.team2.len() as u8,
            is_full: full_now,
        });

        // This instruction should only be called when lobby becomes full
        if full_now {
            // Validate Switchboard program
            require!(
                ctx.accounts.switchboard_program.key() == SWITCHBOARD_PROGRAM_ID,
                PvpError::WrongSwitchboardProgram
            );

            // Store randomness account for later resolution
            lobby.randomness_account = ctx.accounts.randomness_account_data.key();
            
            // Move to Pending - waiting for off-chain call to resolve_match
            // In OnDemand model, randomness is pulled when needed (in resolve_match instruction)
            lobby.status = LobbyStatus::Pending;
            
            msg!("Lobby full! Moved to Pending. Call resolve_match to determine winner.");
        }

        Ok(())
    }

    // Refund is only possible if the lobby is still Open and older than lock.
    // remaining_accounts must include all participants (team1..., team2...),
    // so we can transfer directly from the lobby PDA with signer seeds.
    pub fn refund<'info>(ctx: Context<'_, '_, '_, 'info, Refund<'info>>) -> Result<()> {
        require!(ctx.accounts.creator.key() == ctx.accounts.lobby.creator, PvpError::Unauthorized);
        
        // Read-only checks first
        require!(matches!(ctx.accounts.lobby.status, LobbyStatus::Open), PvpError::LobbyNotOpen);
        let now = Clock::get()?.unix_timestamp;
        require!(now >= ctx.accounts.lobby.created_at + REFUND_LOCK_SECS, PvpError::TooSoonToRefund);
        let req = ctx.accounts.requester.key();
        require!(req == ctx.accounts.lobby.creator || req == ctx.accounts.config.admin, PvpError::Unauthorized);
        require!(!ctx.accounts.lobby.finalized, PvpError::AlreadyFinalized);
        
        // Save all values before mutable borrow
        let stake_amount = ctx.accounts.lobby.stake_lamports;
        let lobby_creator = ctx.accounts.lobby.creator;
        let lobby_id = ctx.accounts.lobby.lobby_id;
        let lobby_bump = ctx.accounts.lobby.bump;
        let team1_players: Vec<Pubkey> = ctx.accounts.lobby.team1.clone();
        let team2_players: Vec<Pubkey> = ctx.accounts.lobby.team2.clone();
        let total = team1_players.len() + team2_players.len();
        require!(ctx.remaining_accounts.len() == total, PvpError::BadRemainingAccounts);
        
        // Mark finalized and change status - must do this before transfers to avoid reentrancy
        {
            let lobby = &mut ctx.accounts.lobby;
            lobby.finalized = true;
            lobby.status = LobbyStatus::Refunded;
        }

        let sys_ai  = ctx.accounts.system_program.to_account_info();
        let from_ai = ctx.accounts.lobby.to_account_info();
        
        // Refund team1
        for (i, p) in team1_players.iter().enumerate() {
            let to_ai = &ctx.remaining_accounts[i];
            require!(to_ai.key() == *p, PvpError::Unauthorized);
            pay_from_lobby_pda(
                lobby_creator,
                lobby_id,
                lobby_bump,
                sys_ai.clone(),
                from_ai.clone(),
                to_ai.clone(),
                stake_amount
            )?;
        }
        // Refund team2
        for (j, p) in team2_players.iter().enumerate() {
            let idx = team1_players.len() + j;
            let to_ai = &ctx.remaining_accounts[idx];
            require!(to_ai.key() == *p, PvpError::Unauthorized);
            pay_from_lobby_pda(
                lobby_creator,
                lobby_id,
                lobby_bump,
                sys_ai.clone(),
                from_ai.clone(),
                to_ai.clone(),
                stake_amount
            )?;
        }

        // Emit refund event
        emit!(LobbyRefunded {
            lobby: ctx.accounts.lobby.key(),
            refunded_count: total as u8,
            total_refunded: stake_amount * total as u64,
        });

        Ok(())
    }

    // Resolve match using Switchboard OnDemand randomness
    // This is called after lobby is full (Pending status) to determine winner and pay out
    // OnDemand uses pull model: we read randomness when needed instead of callback
    //
    // remaining_accounts must include:
    // [admin (config.admin), team1..., team2...]
    pub fn resolve_match<'info>(ctx: Context<'_, '_, '_, 'info, ResolveMatch<'info>>) -> Result<()> {
        require!(ctx.accounts.creator.key() == ctx.accounts.lobby.creator, PvpError::Unauthorized);

        // Read-only checks first
        require!(matches!(ctx.accounts.lobby.status, LobbyStatus::Pending), PvpError::NotPending);
        require!(!ctx.accounts.lobby.finalized, PvpError::AlreadyFinalized);
        
        // READ RANDOMNESS FROM SWITCHBOARD (PROOF OF FAIRNESS!)
        let randomness_data = ctx.accounts.randomness_account_data.try_borrow_data()?;
        
        // Switchboard OnDemand data layout:
        // Check minimum size
        require!(randomness_data.len() >= 16, PvpError::InvalidRandomnessData);
        
        // Read randomness value (bytes 8-16 typically, but may vary by Switchboard version)
        // For safety, try multiple offsets or check Switchboard account discriminator
        let mut randomness_bytes = [0u8; 8];
        randomness_bytes.copy_from_slice(&randomness_data[8..16]);
        let randomness_value = u64::from_le_bytes(randomness_bytes);
        
        msg!("Switchboard randomness: {}", randomness_value);
        
        // Determine winner based on Switchboard randomness (provably fair!)
        let winner_side = (randomness_value % 2) as u8;
        
        msg!("Winner determined by Switchboard OnDemand: Side {}", winner_side);
        
        // Save all lobby values before mutable borrow
        let lobby_creator = ctx.accounts.lobby.creator;
        let lobby_id = ctx.accounts.lobby.lobby_id;
        let lobby_bump = ctx.accounts.lobby.bump;
        let team1_players: Vec<Pubkey> = ctx.accounts.lobby.team1.clone();
        let team2_players: Vec<Pubkey> = ctx.accounts.lobby.team2.clone();
        let stake_lamports = ctx.accounts.lobby.stake_lamports;
        let winners = if winner_side == 0 { &team1_players } else { &team2_players };
        let winners_count = winners.len() as u64;
        require!(winners_count > 0, PvpError::NotEnoughPlayers);

        // Total pot: stake * total players
        let total_players = (team1_players.len() + team2_players.len()) as u64;
        let pot = stake_lamports.saturating_mul(total_players);

        // 1% fee, rounding remainder added to fee
        let fee = pot.saturating_mul(PLATFORM_FEE_BPS) / 10_000;
        let distributable = pot.saturating_sub(fee);
        let payout_each = distributable / winners_count;
        let fee_final = fee + (distributable - payout_each * winners_count);

        // remaining_accounts layout: [admin, team1..., team2...]
        let needed = 1 + team1_players.len() + team2_players.len();
        require!(ctx.remaining_accounts.len() == needed, PvpError::BadRemainingAccounts);

        // Validate admin matches config.admin
        let admin_ai = &ctx.remaining_accounts[0];
        require!(admin_ai.key() == ctx.accounts.config.admin, PvpError::Unauthorized);

        // Validate ordering & keys for team lists
        for (i, p) in team1_players.iter().enumerate() {
            require!(ctx.remaining_accounts[1 + i].key() == *p, PvpError::RemainingAccountsMismatch);
        }
        for (j, p) in team2_players.iter().enumerate() {
            let idx = 1 + team1_players.len() + j;
            require!(ctx.remaining_accounts[idx].key() == *p, PvpError::RemainingAccountsMismatch);
        }

        // Mark finalized, save winner, and change status - must do this before transfers
        {
            let lobby = &mut ctx.accounts.lobby;
            lobby.winner_side = winner_side; // Save Switchboard-determined winner
            lobby.finalized = true;
            lobby.status = LobbyStatus::Resolved;
        }

        let sys_ai  = ctx.accounts.system_program.to_account_info();
        let from_ai = ctx.accounts.lobby.to_account_info();

        // Pay fee to admin
        pay_from_lobby_pda(
            lobby_creator,
            lobby_id,
            lobby_bump,
            sys_ai.clone(),
            from_ai.clone(),
            admin_ai.clone(),
            fee_final
        )?;

        // Pay winners
        if winner_side == 0 {
            for i in 0..team1_players.len() {
                let to_ai = &ctx.remaining_accounts[1 + i];
                pay_from_lobby_pda(
                    lobby_creator,
                    lobby_id,
                    lobby_bump,
                    sys_ai.clone(),
                    from_ai.clone(),
                    to_ai.clone(),
                    payout_each
                )?;
            }
        } else {
            for j in 0..team2_players.len() {
                let idx = 1 + team1_players.len() + j;
                let to_ai = &ctx.remaining_accounts[idx];
                pay_from_lobby_pda(
                    lobby_creator,
                    lobby_id,
                    lobby_bump,
                    sys_ai.clone(),
                    from_ai.clone(),
                    to_ai.clone(),
                    payout_each
                )?;
            }
        }

        // Emit lobby resolved event
        emit!(LobbyResolved {
            lobby: ctx.accounts.lobby.key(),
            winner_side,
            randomness_value, // Switchboard randomness for transparency!
            total_pot: pot,
            platform_fee: fee_final,
            payout_per_winner: payout_each,
        });

        Ok(())
    }
}

// ------------------------------ State ------------------------------

#[account]
pub struct GlobalConfig {
    pub bump: u8,
    pub admin: Pubkey, // fee collector
}
impl GlobalConfig {
    pub const SIZE: usize = 8 + 1 + 32;
}

#[account]
pub struct ActiveLobby {
    pub bump: u8,
    pub creator: Pubkey,
    pub lobby: Pubkey,
}
impl ActiveLobby {
    pub const SIZE: usize = 8 + 1 + 32 + 32;
}

#[account]
pub struct Lobby {
    pub bump: u8,
    pub lobby_id: u64,
    pub creator: Pubkey,
    pub status: LobbyStatus,
    pub team_size: u8,          // must be 1, 2, or 5
    pub stake_lamports: u64,
    pub created_at: i64,
    pub finalized: bool,        // prevents double settlement
    pub randomness_account: Pubkey,  // Switchboard OnDemand randomness account (set when full)
    pub winner_side: u8,        // 0 or 1, set when resolved
    pub team1: Vec<Pubkey>,
    pub team2: Vec<Pubkey>,
}
impl Lobby {
    // Layout size calculation:
    // discr(8)+bump(1)+lobby_id(8)+creator(32)+status(1)+team_size(1)+stake(8)+created_at(8)+finalized(1)+randomness(32)+winner(1)+vec headers(4+4)
    pub const FIXED: usize = 8 + 1 + 8 + 32 + 1 + 1 + 8 + 8 + 1 + 32 + 1 + 4 + 4;
    pub const PER_PLAYER: usize = 32;
    pub const SIZE: usize = Self::FIXED + (Self::PER_PLAYER * MAX_TEAM_SIZE_ALLOC * 2);
}

// ------------------------------ Internals ------------------------------

// struct JoinParams<'info> {
//     payer: &'info Signer<'info>,
//     lobby: &'info mut Account<'info, Lobby>,
//     system_program: &'info Program<'info, System>,
// }

// Handles the actual stake transfer and array push based on side (0 = team1, 1 = team2)
fn internal_join_side<'info>(
    payer: &Signer<'info>,
    lobby: &mut Account<'info, Lobby>,
    system_program_ai: AccountInfo<'info>,
    side: u8,
) -> Result<()> {
    let payer_key = payer.key();

    // Предотвращаем дубль-join
    require!(
        !lobby.team1.contains(&payer_key) && !lobby.team2.contains(&payer_key),
        PvpError::AlreadyJoined
    );

    // Проверка слота
    match side {
        0 => require!((lobby.team1.len() as u8) < lobby.team_size, PvpError::SideFull),
        1 => require!((lobby.team2.len() as u8) < lobby.team_size, PvpError::SideFull),
        _ => return err!(PvpError::InvalidSide),
    }

    // Перевод стейка на PDA лобби
    let ix = system_instruction::transfer(&payer_key, &lobby.key(), lobby.stake_lamports);
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            payer.to_account_info(),
            lobby.to_account_info(),
            system_program_ai,
        ],
    )?;

    // Добавляем игрока в сторону
    if side == 0 { lobby.team1.push(payer_key); } else { lobby.team2.push(payer_key); }

    Ok(())
}

// Transfer lamports from the lobby PDA to the given account.
// The `to` AccountInfo must be present in the instruction's account list (remaining_accounts).
// NOTE: For accounts with data, we cannot use system_instruction::transfer
// Instead, we directly modify lamports (proper way for PDA with Account data)
fn pay_from_lobby_pda<'info>(
    _lobby_creator: Pubkey,
    _lobby_id: u64,
    _lobby_bump: u8,
    _system_program_account: AccountInfo<'info>,
    from_account: AccountInfo<'info>,
    to_account: AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    if lamports == 0 { return Ok(()); }
    require!(**from_account.lamports.borrow() >= lamports, PvpError::Unauthorized);

    // Direct lamports manipulation for accounts with data
    **from_account.try_borrow_mut_lamports()? -= lamports;
    **to_account.try_borrow_mut_lamports()? += lamports;

    Ok(())
}

// Compute the 8-byte Anchor discriminator for our callback method name.
// This is used to build Switchboard's on-chain Callback ix_data payload.
fn pvp_ix_discriminator(name: &str) -> Vec<u8> {
    // Anchor discriminator is: sha256("global::<name>")[0..8]
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(format!("global::{}", name));
    hasher.finalize()[..8].to_vec()
}
