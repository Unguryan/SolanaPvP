// Security: See security.txt in the repository root for security policy and contact information
// --------------------------------------------------------------------------
// Final Anchor program with Orao VRF integration (English comments)
// --------------------------------------------------------------------------
// Key properties:
// - Allowed team sizes: 1, 2, 5 (validated on create)
// - side: u8 as bit → 0 = team1, 1 = team2
// - Min stake: 0.05 SOL (50_000_000 lamports)
// - Fixed platform fee: 1% (sent to hardcoded TREASURY_PUBKEY)
// - Creator pays and joins immediately on create_lobby
// - Exactly one active lobby per creator enforced by ActiveLobby PDA
// - Auto VRF request on the LAST join (no off-chain picker) → status moves to Pending
// - Orao VRF oracles fulfill randomness automatically (sub-second)
// - Refund is only possible from Open state (i.e., before VRF request) and after 2 minutes
// - Careful use of remaining_accounts for payouts to ensure target AccountInfos are present
//
// Notes:
// - Orao VRF uses seed-based requests: request creates PDA, oracles fulfill automatically
// - Request is made via CPI call in join_side_final
// - ResolveMatch reads fulfilled randomness from Orao VRF account
// - ActiveLobby is closed after final resolution or refund (returns rent to creator).

use anchor_lang::prelude::{*, Context, Program};
use anchor_lang::system_program::System;
use anchor_lang::solana_program::system_instruction;
// Orao VRF types and constants
use orao_solana_vrf::program::OraoVrf;
use orao_solana_vrf::state::NetworkState;
use orao_solana_vrf::CONFIG_ACCOUNT_SEED;
use orao_solana_vrf::RANDOMNESS_ACCOUNT_SEED;

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
    source_release: "v1.0.4",
    source_revision: "main"
}

// ------------------------------ Constants ------------------------------

declare_id!("F2LhVGUa9yLbYVYujYMPyckqWmsokHE9wym7ceGHWUMZ");

// Orao VRF program ID (same for devnet and mainnet)
// VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y
pub use orao_solana_vrf::ID as ORAO_VRF_PROGRAM_ID;

// Hardcoded admin and treasury addresses (SECURE!)
// Admin: Can authorize refunds and resolves
pub const ADMIN_PUBKEY: Pubkey = anchor_lang::solana_program::pubkey!("7tjJ6oCmrGMnin2kMf8msTqqxSYgq3J8wBW4zoheRdPz");
// Treasury: Receives platform fees (1%)
pub const TREASURY_PUBKEY: Pubkey = anchor_lang::solana_program::pubkey!("5tFuAw8fBq9mPgj26NbYHwMa9WoJm4cUScbaCd6TQoJ6");

// PDA seeds
const SEED_LOBBY:  &[u8] = b"lobby";
const SEED_ACTIVE: &[u8] = b"active";

// Economics
const PLATFORM_FEE_BPS: u64 = 100;            // 1%
const MIN_STAKE_LAMPORTS: u64 = 50_000_000;   // 0.05 SOL
const REFUND_LOCK_SECS: i64 = 120;            // 2 minutes

// Team sizing
const MAX_TEAM_SIZE_ALLOC: usize = 5;         // allocation cap
const ALLOWED_TEAM_SIZES: [u8; 3] = [1, 2, 5]; // allowed sizes

// ------------------------------ Types / Errors ------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
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
    pub vrf_request: Pubkey, // Orao VRF request account (set when full)
}

#[event]
pub struct LobbyResolved {
    pub lobby: Pubkey,
    pub winner_side: u8,
    pub randomness_value: u64, // Orao VRF randomness for transparency!
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
    #[msg("Lobby not pending")]
    NotPending,
    #[msg("Lobby is full - must use join_side_final instruction")]
    MustUseFinalJoin,

    #[msg("Wrong VRF request account provided")]
    WrongRandomnessAccount,
    
    #[msg("Invalid randomness data")]
    InvalidRandomnessData,
    
    #[msg("Randomness not yet fulfilled by Orao VRF")]
    RandomnessNotFulfilled,
    
    #[msg("Wrong VRF treasury")]
    WrongVrfTreasury,
    
    #[msg("Invalid VRF seed (cannot be zero)")]
    InvalidVrfSeed,
}


// ------------------------------ Accounts ------------------------------


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

    pub system_program: Program<'info, System>,
}

// JoinSideFull - for the final join (when lobby becomes full after this join)
// Uses Orao VRF for verifiable randomness
#[derive(Accounts)]
#[instruction(side: u8, vrf_seed: [u8; 32])]
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

    /// Orao VRF randomness request account (PDA derived from seed)
    /// CHECK: Will be created/validated by Orao VRF program via CPI
    #[account(
        mut,
        seeds = [RANDOMNESS_ACCOUNT_SEED, vrf_seed.as_ref()],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]
    pub vrf_request: AccountInfo<'info>,

    /// Orao VRF network configuration
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]
    pub vrf_config: Account<'info, NetworkState>,

    /// Orao VRF treasury (fee collector)
    /// CHECK: Validated by Orao VRF program
    #[account(mut)]
    pub vrf_treasury: AccountInfo<'info>,

    /// Orao VRF program
    pub vrf_program: Program<'info, OraoVrf>,

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

    pub system_program: Program<'info, System>,
    // remaining_accounts: [all participants: team1..., team2...]
}

// ResolveMatch - Called to resolve a match and pay winners
// This is separate from join_side_final so we can handle payouts with remaining_accounts
// remaining_accounts must include: [treasury, team1..., team2...]
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

    /// Orao VRF randomness request account
    /// CRITICAL: Must be owned by Orao VRF and match the saved account
    /// This ensures randomness is provably fair and cannot be manipulated
    /// CHECK: Verified via owner check (ORAO_VRF_PROGRAM_ID) and constraint check (matches lobby.vrf_seed)
    #[account(
        mut,
        owner = ORAO_VRF_PROGRAM_ID,
        constraint = vrf_request.key() == lobby.vrf_request @ PvpError::WrongRandomnessAccount
    )]
    pub vrf_request: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    // remaining_accounts: [admin, team1..., team2...]
}

// ------------------------------ Program ------------------------------

#[program]
pub mod pvp_program {
    use super::*;


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
        lobby.vrf_seed           = [0u8; 32]; // will be set in join_side_final
        lobby.vrf_request        = Pubkey::default(); // will be set in join_side_final
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
            vrf_request: lobby.vrf_request, // Not set yet for non-final joins
        });

        // If lobby is full, this is an error - should have used join_side_final
        require!(!full_now, PvpError::MustUseFinalJoin);

        Ok(())
    }

    // Final join - when this join will fill the lobby and trigger VRF request.
    // IMPORTANT: Caller must provide all Switchboard VRF accounts.
    pub fn join_side_final(ctx: Context<JoinSideFull>, side: u8, vrf_seed: [u8; 32]) -> Result<()> {
        msg!("🎯 join_side_final CALLED - side: {}, vrf_seed: {:?}", side, &vrf_seed[..8]);
        require!(side <= 1, PvpError::InvalidSide);
        require!(vrf_seed != [0u8; 32], PvpError::InvalidVrfSeed);

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

        // This instruction should only be called when lobby becomes full
        if full_now {
            msg!("🎲 Lobby FULL! Requesting VRF...");
            // Store VRF seed and request for later resolution
            lobby.vrf_seed = vrf_seed;
            lobby.vrf_request = ctx.accounts.vrf_request.key();

            // Request randomness from Orao VRF using proper CPI (like in russian-roulette example)
            let cpi_program = ctx.accounts.vrf_program.to_account_info();
            let cpi_accounts = orao_solana_vrf::cpi::accounts::RequestV2 {
                payer: ctx.accounts.player.to_account_info(),
                network_state: ctx.accounts.vrf_config.to_account_info(),
                treasury: ctx.accounts.vrf_treasury.to_account_info(),
                request: ctx.accounts.vrf_request.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            orao_solana_vrf::cpi::request_v2(cpi_ctx, vrf_seed)?;
            
            msg!("VRF request sent to Orao network!");
            
            // Move to Pending - waiting for Orao oracles to fulfill (sub-second!)
            lobby.status = LobbyStatus::Pending;
            
            msg!("Lobby full! VRF requested. Waiting for fulfillment, then call resolve_match.");
        }

        // Emit player joined event AFTER VRF request (so vrf_request is included)
        emit!(PlayerJoined {
            lobby: lobby.key(),
            player: ctx.accounts.player.key(),
            side,
            team1_count: lobby.team1.len() as u8,
            team2_count: lobby.team2.len() as u8,
            is_full: full_now,
            vrf_request: lobby.vrf_request,
        });

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
        require!(req == ctx.accounts.lobby.creator || req == ADMIN_PUBKEY, PvpError::Unauthorized);
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

    // Force refund - allows refund in any status (admin/creator only)
    // Use this to unstuck broken lobbies (e.g. Pending with wrong randomness account)
    pub fn force_refund<'info>(ctx: Context<'_, '_, '_, 'info, Refund<'info>>) -> Result<()> {
        require!(ctx.accounts.creator.key() == ctx.accounts.lobby.creator, PvpError::Unauthorized);
        
        // Check authorization - must be creator or admin
        let req = ctx.accounts.requester.key();
        require!(req == ctx.accounts.lobby.creator || req == ADMIN_PUBKEY, PvpError::Unauthorized);
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
        
        // Mark finalized and change status
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

        msg!("Force refund completed for lobby in status: {:?}", ctx.accounts.lobby.status);
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
        
        // READ RANDOMNESS FROM ORAO VRF (PROOF OF FAIRNESS!)
        // Manual parsing to avoid Anchor version conflicts
        let account_data = ctx.accounts.vrf_request.try_borrow_data()
            .map_err(|_| PvpError::InvalidRandomnessData)?;
        
        // Orao VRF RandomnessV2 structure:
        // [0..8]: Anchor discriminator
        // [8]: Enum tag (0 = Pending, 1 = Fulfilled)
        // If Fulfilled (tag=1):
        //   [9..41]: client pubkey (32 bytes)
        //   [41..73]: seed (32 bytes)
        //   [73..137]: randomness (64 bytes)
        
        if account_data.len() < 137 {
            return Err(PvpError::InvalidRandomnessData.into());
        }
        
        // Check if fulfilled (enum tag == 1)
        let is_fulfilled = account_data[8] == 1;
        if !is_fulfilled {
            return Err(PvpError::RandomnessNotFulfilled.into());
        }
        
        // Extract randomness bytes [73..137]
        let mut randomness_bytes = [0u8; 64];
        randomness_bytes.copy_from_slice(&account_data[73..137]);
        
        // Convert first 8 bytes to u64 for transparency logging
        let mut randomness_u64_bytes = [0u8; 8];
        randomness_u64_bytes.copy_from_slice(&randomness_bytes[0..8]);
        let randomness_value = u64::from_le_bytes(randomness_u64_bytes);
        
        msg!("Orao VRF randomness: {}", randomness_value);
        
        // Determine winner based on Orao VRF randomness (provably fair!)
        let winner_side = (randomness_value % 2) as u8;
        
        msg!("Winner determined by Orao VRF: Side {}", winner_side);
        
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

        // remaining_accounts layout: [treasury (fees receiver), team1..., team2...]
        let needed = 1 + team1_players.len() + team2_players.len();
        require!(ctx.remaining_accounts.len() == needed, PvpError::BadRemainingAccounts);

        // Validate first account is treasury (receives platform fees)
        let treasury_ai = &ctx.remaining_accounts[0];
        require!(treasury_ai.key() == TREASURY_PUBKEY, PvpError::Unauthorized);

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

        // Pay fee to treasury
        pay_from_lobby_pda(
            lobby_creator,
            lobby_id,
            lobby_bump,
            sys_ai.clone(),
            from_ai.clone(),
            treasury_ai.clone(),
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
    pub vrf_seed: [u8; 32],     // Orao VRF seed for randomness request
    pub vrf_request: Pubkey,    // Orao VRF request account PDA (set when full)
    pub winner_side: u8,        // 0 or 1, set when resolved
    pub team1: Vec<Pubkey>,
    pub team2: Vec<Pubkey>,
}
impl Lobby {
    // Layout size calculation:
    // discr(8)+bump(1)+lobby_id(8)+creator(32)+status(1)+team_size(1)+stake(8)+created_at(8)+finalized(1)+vrf_seed(32)+vrf_request(32)+winner(1)+vec headers(4+4)
    pub const FIXED: usize = 8 + 1 + 8 + 32 + 1 + 1 + 8 + 8 + 1 + 32 + 32 + 1 + 4 + 4;
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
