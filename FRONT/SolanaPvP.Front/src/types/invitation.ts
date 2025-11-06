// Invitation related types
export enum InvitationStatus {
  Pending = "Pending",
  Accepted = "Accepted",
  Declined = "Declined",
  Expired = "Expired",
  Cancelled = "Cancelled",
}

export interface MatchInvitation {
  id: number;
  inviterPubkey: string;
  inviteePubkey: string;
  gameType: string;        // NEW: "PickHigher", etc.
  gameMode: string;        // CHANGED: now string ("1x3", "3x9", "5x16")
  matchMode: string;       // NEW: "Team" or "DeathMatch"
  teamSize: string;        // RENAMED: from matchType
  stakeLamports: number;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  matchPda?: string;
  inviter?: {
    pubkey: string;
    username?: string;
  };
  invitee?: {
    pubkey: string;
    username?: string;
  };
  match?: {
    id: number;
    matchPda: string;
    status: string;
  };
}

export interface CreateInvitationRequest {
  inviteePubkey: string;
  gameType: string;        // NEW
  gameMode: string;        // CHANGED
  matchMode: string;       // NEW
  teamSize: string;        // RENAMED
  stakeLamports: number;
  expirationMinutes?: number;
}
