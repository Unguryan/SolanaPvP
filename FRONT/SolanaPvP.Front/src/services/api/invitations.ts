// Invitation API service
import { apiClient } from "./client";
import {
  MatchInvitation,
  CreateInvitationRequest,
  InvitationStatus,
} from "@/types/invitation";

export const invitationsApi = {
  // Create invitation
  async createInvitation(
    request: CreateInvitationRequest
  ): Promise<MatchInvitation> {
    return apiClient.post<MatchInvitation>("/api/invitations", request);
  },

  // Get invitation by ID
  async getInvitation(invitationId: number): Promise<MatchInvitation> {
    return apiClient.get<MatchInvitation>(`/api/invitations/${invitationId}`);
  },

  // Get current user's invitations
  async getMyInvitations(
    status?: InvitationStatus
  ): Promise<MatchInvitation[]> {
    const params = status ? `?status=${status}` : "";
    return apiClient.get<MatchInvitation[]>(`/api/invitations/me${params}`);
  },

  // Get user invitations by pubkey
  async getUserInvitations(
    pubkey: string,
    status?: InvitationStatus
  ): Promise<MatchInvitation[]> {
    const params = status ? `?status=${status}` : "";
    return apiClient.get<MatchInvitation[]>(
      `/api/invitations/user/${pubkey}${params}`
    );
  },

  // Accept invitation
  async acceptInvitation(invitationId: number): Promise<MatchInvitation> {
    return apiClient.post<MatchInvitation>(
      `/api/invitations/${invitationId}/accept`
    );
  },

  // Decline invitation
  async declineInvitation(invitationId: number): Promise<MatchInvitation> {
    return apiClient.post<MatchInvitation>(
      `/api/invitations/${invitationId}/decline`
    );
  },

  // Cancel invitation
  async cancelInvitation(invitationId: number): Promise<MatchInvitation> {
    return apiClient.post<MatchInvitation>(
      `/api/invitations/${invitationId}/cancel`
    );
  },
};
