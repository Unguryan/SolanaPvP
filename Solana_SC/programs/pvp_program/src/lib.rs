// Simplified Solana PvP Program with Basic Randomness
// --------------------------------------------------------------------------
// Key properties:
// - Allowed team sizes: 1, 2, 5 (validated on create)
// - side: u8 as bit → 0 = team1, 1 = team2
// - Min stake: 0.05 SOL (50_000_000 lamports)
// - Fixed platform fee: 1% (sent to GlobalConfig.admin)
// - Creator pays and joins immediately on create_lobby
// - Exactly one active lobby per creator enforced by ActiveLobby PDA
// - Simple randomness using recent blockhash when lobby is full
// - Refund is only possible from Open state and after 2 minutes

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{system_instruction, system_program};
use anchor_lang::Discriminator;

use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha20Rng;

// ------------------------------ Constants ------------------------------

declare_id!("6kf6QWaHacEvoyXeqrs78JqhRavBYjm7VdnqxWjiKLWY");

// Simple VRF using recent blockhashes
pub const VRF_SEED: &[u8] = b"pvp_vrf";

// PDA seeds
const SEED_LOBBY:  &[u8] = b"lobby";
const SEED_ACTIVE: &[u8] = b"active";
const SEED_CONFIG: &[u8] = b"config";

// Constants
const MIN_STAKE_LAMPORTS: u64 = 50_000_000; // 0.05 SOL
const PLATFORM_FEE_BPS: u64 = 100; // 1%
const MAX_TEAM_SIZE_ALLOC: usize = 5;

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
        require!(team_size == 1 || team_size == 2 || team_size == 5, PvpError::InvalidTeamSize);
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
        lobby.team1          = Vec::with_capacity(team_size as usize);
        lobby.team2          = Vec::with_capacity(team_size as usize);

        // Mark an active lobby for this creator (prevents creating another)
        let active = &mut ctx.accounts.active;
        active.bump    = ctx.bumps.active;
        active.creator = lobby.creator;
        active.lobby   = lobby.key();

        // Creator pays and joins immediately
        internal_join_side(
            JoinParams {
                payer: &ctx.accounts.creator,
                lobby: &mut ctx.accounts.lobby,
                system_program: &ctx.accounts.system_program,
            },
            side,
        )?;

        Ok(())
    }

    // Join a lobby (Open → Open or Open → Resolved if full).
    // side: 0 (team1) / 1 (team2)
    pub fn join_side(
        ctx: Context<JoinSide>,
        side: u8,
    ) -> Result<()> {
        require!(side <= 1, PvpError::InvalidSide);

        let lobby = &mut ctx.accounts.lobby;
        require!(lobby.status == LobbyStatus::Open, PvpError::LobbyNotOpen);

        // Check if team is full
        let team = if side == 0 { &lobby.team1 } else { &lobby.team2 };
        require!(team.len() < lobby.team_size as usize, PvpError::TeamFull);

        // Join the team
        internal_join_side(
            JoinParams {
                payer: &ctx.accounts.payer,
                lobby: &mut ctx.accounts.lobby,
                system_program: &ctx.accounts.system_program,
            },
            side,
        )?;

        // Check if lobby is now full
        let full_now =
            (lobby.team1.len() as u8 == lobby.team_size) &&
            (lobby.team2.len() as u8 == lobby.team_size);

        if full_now {
            // Use simple randomness based on recent blockhash and lobby data
            let random_value = generate_random_value(&lobby, &ctx.accounts.recent_blockhashes)?;
            
            // Determine winner based on random value
            let winner_side = if random_value % 2 == 0 { 0 } else { 1 }; // 0 = team1, 1 = team2
            
            // Calculate winnings
            let total_stake = lobby.stake_lamports * (lobby.team_size as u64 * 2);
            let platform_fee = total_stake * PLATFORM_FEE_BPS / 10000;
            let winner_pool = total_stake - platform_fee;
            
            // Pay out to winning team
            let winner_team = if winner_side == 0 { &lobby.team1 } else { &lobby.team2 };
            let per_winner = winner_pool / winner_team.len() as u64;
            
            // Pay each winner
            for (i, winner) in winner_team.iter().enumerate() {
                if i < ctx.remaining_accounts.len() {
                    let winner_account = &ctx.remaining_accounts[i];
                    pay_from_lobby_pda(&lobby, &ctx.accounts.system_program, winner_account, per_winner)?;
                }
            }
            
            // Pay platform fee to admin
            if ctx.remaining_accounts.len() > winner_team.len() {
                let admin_account = &ctx.remaining_accounts[winner_team.len()];
                pay_from_lobby_pda(&lobby, &ctx.accounts.system_program, admin_account, platform_fee)?;
            }
            
            // Move to Resolved state
            lobby.status = LobbyStatus::Resolved;
            lobby.finalized = true;
        }

        Ok(())
    }

    // Refund from Open state (before resolution) and after 2 minutes.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let lobby = &mut ctx.accounts.lobby;
        require!(lobby.status == LobbyStatus::Open, PvpError::LobbyNotOpen);
        require!(lobby.creator == ctx.accounts.requester.key(), PvpError::Unauthorized);

        // Check if 2 minutes have passed
        let now = Clock::get()?.unix_timestamp;
        require!(now - lobby.created_at >= 120, PvpError::RefundTooEarly);

        // Refund all participants
        let total_participants = lobby.team1.len() + lobby.team2.len();
        let refund_per_person = lobby.stake_lamports;

        // Refund team1
        for (i, _) in lobby.team1.iter().enumerate() {
            if i < ctx.remaining_accounts.len() {
                let account = &ctx.remaining_accounts[i];
                pay_from_lobby_pda(&lobby, &ctx.accounts.system_program, account, refund_per_person)?;
            }
        }

        // Refund team2
        for (i, _) in lobby.team2.iter().enumerate() {
            let account_index = lobby.team1.len() + i;
            if account_index < ctx.remaining_accounts.len() {
                let account = &ctx.remaining_accounts[account_index];
                pay_from_lobby_pda(&lobby, &ctx.accounts.system_program, account, refund_per_person)?;
            }
        }

        // Refund creator
        if total_participants < ctx.remaining_accounts.len() {
            let creator_account = &ctx.remaining_accounts[total_participants];
            pay_from_lobby_pda(&lobby, &ctx.accounts.system_program, creator_account, refund_per_person)?;
        }

        // Update status
        lobby.status = LobbyStatus::Refunded;
        lobby.finalized = true;

        Ok(())
    }
}

// ------------------------------ Accounts ------------------------------

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

#[derive(Accounts)]
pub struct JoinSide<'info> {
    #[account(
        mut,
        seeds = [SEED_LOBBY, lobby.creator.as_ref(), &lobby.lobby_id.to_le_bytes()],
        bump = lobby.bump
    )]
    pub lobby: Account<'info, Lobby>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Recent blockhashes sysvar
    pub recent_blockhashes: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    // remaining_accounts: [all participants: team1..., team2...]
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(
        mut,
        seeds = [SEED_LOBBY, lobby.creator.as_ref(), &lobby.lobby_id.to_le_bytes()],
        bump
    )]
    pub lobby: Account<'info, Lobby>,

    pub requester: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_ACTIVE, lobby.creator.as_ref()],
        bump
    )]
    pub active: Account<'info, ActiveLobby>,

    pub system_program: Program<'info, System>,
    // remaining_accounts: [all participants: team1..., team2...]
}

// ------------------------------ State ------------------------------

#[account]
pub struct ActiveLobby {
    pub bump: u8,
    pub creator: Pubkey,
    pub lobby: Pubkey,
}

#[account]
pub struct GlobalConfig {
    pub bump: u8,
    pub admin: Pubkey,
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
    pub team_size: u8,
    pub stake_lamports: u64,
    pub created_at: i64,
    pub finalized: bool,
    pub team1: Vec<Pubkey>,
    pub team2: Vec<Pubkey>,
}

impl Lobby {
    // Layout size calculation:
    // discr(8)+bump(1)+lobby_id(8)+creator(32)+status(1)+team_size(1)+stake(8)+created_at(8)+finalized(1)+vec headers(4+4)
    pub const FIXED: usize = 8 + 1 + 8 + 32 + 1 + 1 + 8 + 8 + 1 + 4 + 4;
    pub const PER_PLAYER: usize = 32;
    pub const SIZE: usize = Self::FIXED + (Self::PER_PLAYER * MAX_TEAM_SIZE_ALLOC * 2);
}

// ------------------------------ Internals ------------------------------

struct JoinParams<'info> {
    payer: &'info Signer<'info>,
    lobby: &'info mut Account<'info, Lobby>,
    system_program: &'info Program<'info, System>,
}

// Handles the actual stake transfer and array push based on side (0 = team1, 1 = team2)
fn internal_join_side(mut params: JoinParams, side: u8) -> Result<()> {
    let payer_key = params.payer.key();
    let lobby = &mut params.lobby;

    // Transfer stake to lobby PDA
    let cpi_ctx = CpiContext::new(
        params.system_program.to_account_info(),
        system_instruction::Transfer {
            from: params.payer.to_account_info(),
            to: lobby.to_account_info(),
        },
    );
    system_instruction::transfer(cpi_ctx, lobby.stake_lamports)?;

    // Push player into the selected team
    if side == 0 { lobby.team1.push(payer_key); } else { lobby.team2.push(payer_key); }

    Ok(())
}

// Transfer lamports from the lobby PDA to the given account.
// The `to` AccountInfo must be present in the instruction's account list (remaining_accounts).
fn pay_from_lobby_pda<'a>(
    lobby: &Account<'a, Lobby>,
    system_program_acc: &Program<'a, System>,
    to: &AccountInfo<'a>,
    lamports: u64,
) -> Result<()> {
    if lamports == 0 { return Ok(()); }
    require!(**lobby.to_account_info().lamports.borrow() >= lamports, PvpError::Unauthorized);

    let seeds = &[
        SEED_LOBBY,
        lobby.creator.as_ref(),
        &lobby.lobby_id.to_le_bytes(),
        &[lobby.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        system_program_acc.to_account_info(),
        system_instruction::Transfer {
            from: lobby.to_account_info(),
            to: to.clone(),
        },
        signer,
    );
    system_instruction::transfer(cpi_ctx, lamports)
}

// Generate a random value using recent blockhash and lobby data
fn generate_random_value(lobby: &Account<Lobby>, recent_blockhashes: &AccountInfo) -> Result<u64> {
    // Get recent blockhash
    let blockhash = recent_blockhashes.data.borrow();
    let blockhash_bytes = &blockhash[0..32];
    
    // Create seed from blockhash and lobby data
    let mut seed = [0u8; 32];
    for i in 0..16 {
        seed[i] = blockhash_bytes[i];
        seed[i + 16] = (lobby.lobby_id >> (i * 4)) as u8;
    }
    
    // Generate random value using ChaCha20Rng
    let mut rng = ChaCha20Rng::from_seed(seed);
    Ok(rng.gen::<u64>())
}

// ------------------------------ Enums ------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LobbyStatus {
    Open = 0,
    Resolved = 1,
    Refunded = 2,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GameModeType {
    Pick1 = 0,
    Pick3 = 1,
    Pick5 = 2,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MatchType {
    Solo = 0,
    Team = 1,
}

// ------------------------------ Errors ------------------------------

#[error_code]
pub enum PvpError {
    #[msg("Invalid team size. Must be 1, 2, or 5.")]
    InvalidTeamSize,
    #[msg("Stake too small. Minimum is 0.05 SOL.")]
    StakeTooSmall,
    #[msg("Invalid side. Must be 0 or 1.")]
    InvalidSide,
    #[msg("Team is full.")]
    TeamFull,
    #[msg("Lobby is not open.")]
    LobbyNotOpen,
    #[msg("Unauthorized.")]
    Unauthorized,
    #[msg("Refund too early. Must wait 2 minutes.")]
    RefundTooEarly,
}