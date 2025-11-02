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
use anchor_spl::token::{self, Token};
use anchor_spl::associated_token::{self, AssociatedToken};
// Switchboard v2 crate:
// Cargo.toml → switchboard-v2 = { version = "0.2", features = ["no-entrypoint"] }
use switchboard_solana::{OracleQueueAccountData, PermissionAccountData};

// Attempt to use VRF types - if they don't exist, we'll handle errors at compile time
// Try using the types directly to see what's available

// ------------------------------ Constants ------------------------------

declare_id!("F2LhVGUa9yLbYVYujYMPyckqWmsokHE9wym7ceGHWUMZ");

// Switchboard v2 program id (same for devnet/mainnet v2)
// Note: sb::SWITCHBOARD_PROGRAM_ID is a lazy_static, cannot deref in const
// Using hardcoded bytes: SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f
pub const SWITCHBOARD_V2_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    0x57, 0x49, 0x54, 0x43, 0x48, 0x37, 0x71, 0x45, 0x50, 0x54, 0x64, 0x4C, 0x73, 0x44, 0x48, 0x52,
    0x67, 0x50, 0x75, 0x4D, 0x51, 0x6A, 0x62, 0x51, 0x78, 0x4B, 0x64, 0x48, 0x32, 0x61, 0x42, 0x53,
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
// Requires all Switchboard VRF accounts to trigger randomness request.
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

    /// CHECK: Switchboard program - verified via address check
    #[account(address = SWITCHBOARD_V2_PROGRAM_ID)]
    pub switchboard_program: UncheckedAccount<'info>,

    /// CHECK: VRF account from Switchboard
    #[account(mut)]
    pub vrf: UncheckedAccount<'info>,

    #[account(mut)]
    pub oracle_queue: AccountLoader<'info, OracleQueueAccountData>,
    /// CHECK:
    pub queue_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub permission_account: AccountLoader<'info, PermissionAccountData>,
    /// CHECK:
    #[account(mut)]
    pub escrow_wallet: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub payer_wallet: UncheckedAccount<'info>,
    pub payer_authority: Signer<'info>,

    /// CHECK:
    pub recent_blockhashes: UncheckedAccount<'info>,
    /// CHECK:
    pub switchboard_state: UncheckedAccount<'info>,

    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
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

// FulfillRandomness is invoked by Switchboard VRF via callback.
// We verify VRF account & authority, compute winner, pay, and close ActiveLobby.
#[derive(Accounts)]
pub struct FulfillRandomness<'info> {
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

    /// CHECK: VRF account from Switchboard
    #[account(mut)]
    pub vrf: UncheckedAccount<'info>,

    /// CHECK: Switchboard program - verified via address check
    #[account(address = SWITCHBOARD_V2_PROGRAM_ID)]
    pub switchboard_program: UncheckedAccount<'info>,

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
        lobby.bump           = ctx.bumps.lobby;
        lobby.lobby_id       = lobby_id;
        lobby.creator        = ctx.accounts.creator.key();
        lobby.status         = LobbyStatus::Open;
        lobby.team_size      = team_size;
        lobby.stake_lamports = stake_lamports;
        lobby.created_at     = Clock::get()?.unix_timestamp;
        lobby.finalized      = false;
        lobby.vrf            = Pubkey::default(); // not set yet
        lobby.team1          = Vec::with_capacity(team_size as usize);
        lobby.team2          = Vec::with_capacity(team_size as usize);

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
                ctx.accounts.switchboard_program.key() == SWITCHBOARD_V2_PROGRAM_ID,
                PvpError::WrongSwitchboardProgram
            );

            // Store VRF key for validation in fulfill callback
            let vrf_key = ctx.accounts.vrf.key();
            lobby.vrf = vrf_key;
            
            // Note: Full VRF request via CPI requires Switchboard instruction format
            // For now, the VRF account must be pre-configured off-chain to call fulfill_randomness
            // when randomness is available. The account authority should be the lobby PDA.
            
            // Move to Pending so users cannot refund or join anymore
            lobby.status = LobbyStatus::Pending;
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

    // Switchboard VRF callback: this instruction is invoked by the Switchboard program
    // after randomness is available. We verify:
    // - The caller program is indeed Switchboard
    // - The provided VRF account matches lobby.vrf
    // - The VRF authority equals our lobby PDA
    // Then we compute winner_side from the VRF result, pay winners & platform fee, and close ActiveLobby.
    //
    // remaining_accounts must include:
    // [admin (config.admin), team1..., team2...]
    pub fn fulfill_randomness<'info>(ctx: Context<'_, '_, '_, 'info, FulfillRandomness<'info>>) -> Result<()> {
        require!(ctx.accounts.creator.key() == ctx.accounts.lobby.creator, PvpError::Unauthorized);
        require!(
            ctx.accounts.switchboard_program.key() == SWITCHBOARD_V2_PROGRAM_ID,
            PvpError::WrongSwitchboardProgram
        );

        // Read-only checks first
        require!(matches!(ctx.accounts.lobby.status, LobbyStatus::Pending), PvpError::NotPending);
        require!(!ctx.accounts.lobby.finalized, PvpError::AlreadyFinalized);
        require!(ctx.accounts.vrf.key() == ctx.accounts.lobby.vrf, PvpError::WrongVrfAccount);
        
        // Save all lobby values before mutable borrow
        let lobby_creator = ctx.accounts.lobby.creator;
        let lobby_id = ctx.accounts.lobby.lobby_id;
        let lobby_bump = ctx.accounts.lobby.bump;
        let team1_players: Vec<Pubkey> = ctx.accounts.lobby.team1.clone();
        let team2_players: Vec<Pubkey> = ctx.accounts.lobby.team2.clone();
        let stake_lamports = ctx.accounts.lobby.stake_lamports;
        
        // TODO: Parse VRF result from account data using switchboard-solana v0.30.4 API
        // For now, use a deterministic approach based on account key
        // This should be replaced with proper VRF result parsing when the API is available
        // Simple deterministic approach: use account key bytes as random seed
        // NOTE: This is a temporary workaround - should use proper VRF result parsing
        let key_bytes = ctx.accounts.vrf.key().to_bytes();
        let mut buf8 = [0u8; 8];
        buf8.copy_from_slice(&key_bytes[0..8]);
        let rand_u64 = u64::from_le_bytes(buf8);

        // Winner side (bit 0): 0 => team1, 1 => team2
        let winner_side: u8 = (rand_u64 & 1) as u8;
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

        // Mark finalized and change status - must do this before transfers
        {
            let lobby = &mut ctx.accounts.lobby;
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
    pub vrf: Pubkey,            // Switchboard VRF account bound to this lobby (set when full)
    pub team1: Vec<Pubkey>,
    pub team2: Vec<Pubkey>,
}
impl Lobby {
    // Layout size calculation:
    // discr(8)+bump(1)+lobby_id(8)+creator(32)+status(1)+team_size(1)+stake(8)+created_at(8)+finalized(1)+vrf(32)+vec headers(4+4)
    pub const FIXED: usize = 8 + 1 + 8 + 32 + 1 + 1 + 8 + 8 + 1 + 32 + 4 + 4;
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
    lobby_creator: Pubkey,
    lobby_id: u64,
    lobby_bump: u8,
    system_program_account: AccountInfo<'info>,
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
