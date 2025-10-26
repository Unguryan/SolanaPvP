// Invitation related types
import { GameModeType, MatchType } from "./match";

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
  gameMode: GameModeType;
  matchType: MatchType;
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
  gameMode: GameModeType;
  matchType: MatchType;
  stakeLamports: number;
  expirationMinutes?: number;
}
