// Invitation store for match invitations data and state
import { create } from "zustand";
import {
  MatchInvitation,
  CreateInvitationRequest,
  InvitationStatus,
} from "@/types/invitation";
import { invitationsApi } from "@/services/api/invitations";

interface InvitationState {
  // Data
  sentInvitations: MatchInvitation[];
  receivedInvitations: MatchInvitation[];
  allInvitations: MatchInvitation[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setSentInvitations: (invitations: MatchInvitation[]) => void;
  setReceivedInvitations: (invitations: MatchInvitation[]) => void;
  setAllInvitations: (invitations: MatchInvitation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API calls
  loadMyInvitations: (status?: InvitationStatus) => Promise<void>;
  loadUserInvitations: (
    pubkey: string,
    status?: InvitationStatus
  ) => Promise<void>;
  createInvitation: (
    request: CreateInvitationRequest
  ) => Promise<MatchInvitation | null>;
  acceptInvitation: (invitationId: number) => Promise<boolean>;
  declineInvitation: (invitationId: number) => Promise<boolean>;
  cancelInvitation: (invitationId: number) => Promise<boolean>;

  // Real-time updates
  addInvitation: (invitation: MatchInvitation) => void;
  updateInvitation: (invitation: MatchInvitation) => void;
  removeInvitation: (invitationId: number) => void;

  // Computed values
  getPendingInvitations: () => MatchInvitation[];
  getInvitationById: (id: number) => MatchInvitation | undefined;
}

export const useInvitationStore = create<InvitationState>((set, get) => ({
  // Initial state
  sentInvitations: [],
  receivedInvitations: [],
  allInvitations: [],
  isLoading: false,
  error: null,

  // Actions
  setSentInvitations: (invitations) => {
    set({ sentInvitations: invitations });
  },

  setReceivedInvitations: (invitations) => {
    set({ receivedInvitations: invitations });
  },

  setAllInvitations: (invitations) => {
    set({ allInvitations: invitations });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  // API calls
  loadMyInvitations: async (status) => {
    set({ isLoading: true, error: null });

    try {
      const invitations = await invitationsApi.getMyInvitations(status);
      set({ allInvitations: invitations });

      // Separate sent and received invitations
      const sent = invitations.filter(
        (inv: MatchInvitation) => inv.status !== InvitationStatus.Expired
      );
      const received = invitations.filter(
        (inv: MatchInvitation) => inv.status !== InvitationStatus.Expired
      );

      set({
        sentInvitations: sent,
        receivedInvitations: received,
      });
    } catch (error: any) {
      console.error("Failed to load invitations:", error);
      set({
        error: error.response?.data?.message || "Failed to load invitations",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  loadUserInvitations: async (pubkey, status) => {
    set({ isLoading: true, error: null });

    try {
      const invitations = await invitationsApi.getUserInvitations(
        pubkey,
        status
      );
      set({ allInvitations: invitations });
    } catch (error: any) {
      console.error("Failed to load user invitations:", error);
      set({
        error:
          error.response?.data?.message || "Failed to load user invitations",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  createInvitation: async (request) => {
    set({ isLoading: true, error: null });

    try {
      const invitation = await invitationsApi.createInvitation(request);

      // Add to sent invitations
      const { sentInvitations } = get();
      set({ sentInvitations: [invitation, ...sentInvitations] });

      return invitation;
    } catch (error: any) {
      console.error("Failed to create invitation:", error);
      set({
        error: error.response?.data?.message || "Failed to create invitation",
      });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  acceptInvitation: async (invitationId) => {
    set({ isLoading: true, error: null });

    try {
      const invitation = await invitationsApi.acceptInvitation(invitationId);
      get().updateInvitation(invitation);
      return true;
    } catch (error: any) {
      console.error("Failed to accept invitation:", error);
      set({
        error: error.response?.data?.message || "Failed to accept invitation",
      });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  declineInvitation: async (invitationId) => {
    set({ isLoading: true, error: null });

    try {
      const invitation = await invitationsApi.declineInvitation(invitationId);
      get().updateInvitation(invitation);
      return true;
    } catch (error: any) {
      console.error("Failed to decline invitation:", error);
      set({
        error: error.response?.data?.message || "Failed to decline invitation",
      });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelInvitation: async (invitationId) => {
    set({ isLoading: true, error: null });

    try {
      const invitation = await invitationsApi.cancelInvitation(invitationId);
      get().updateInvitation(invitation);
      return true;
    } catch (error: any) {
      console.error("Failed to cancel invitation:", error);
      set({
        error: error.response?.data?.message || "Failed to cancel invitation",
      });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Real-time updates
  addInvitation: (invitation) => {
    const { allInvitations } = get();

    // Check if invitation already exists
    if (!allInvitations.find((inv) => inv.id === invitation.id)) {
      set({ allInvitations: [invitation, ...allInvitations] });
    }
  },

  updateInvitation: (updatedInvitation) => {
    const { allInvitations, sentInvitations, receivedInvitations } = get();

    // Update in all invitations
    const updatedAllInvitations = allInvitations.map((inv) =>
      inv.id === updatedInvitation.id ? updatedInvitation : inv
    );
    set({ allInvitations: updatedAllInvitations });

    // Update in sent invitations
    const updatedSentInvitations = sentInvitations.map((inv) =>
      inv.id === updatedInvitation.id ? updatedInvitation : inv
    );
    set({ sentInvitations: updatedSentInvitations });

    // Update in received invitations
    const updatedReceivedInvitations = receivedInvitations.map((inv) =>
      inv.id === updatedInvitation.id ? updatedInvitation : inv
    );
    set({ receivedInvitations: updatedReceivedInvitations });
  },

  removeInvitation: (invitationId) => {
    const { allInvitations, sentInvitations, receivedInvitations } = get();

    set({
      allInvitations: allInvitations.filter((inv) => inv.id !== invitationId),
      sentInvitations: sentInvitations.filter((inv) => inv.id !== invitationId),
      receivedInvitations: receivedInvitations.filter(
        (inv) => inv.id !== invitationId
      ),
    });
  },

  // Computed values
  getPendingInvitations: () => {
    const { allInvitations } = get();
    return allInvitations.filter(
      (inv) => inv.status === InvitationStatus.Pending
    );
  },

  getInvitationById: (id) => {
    const { allInvitations } = get();
    return allInvitations.find((inv) => inv.id === id);
  },
}));
