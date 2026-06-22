import { apiClient } from "@/lib/api/client";

import type {
  AcceptByTokenInput,
  CreateInviteInput,
  DecideInput,
  Invitation,
  InvitationByTokenResponse,
  InvitationCreateResponse,
  ListInvitationsQuery,
} from "../types";

export const invitationService = {
  list: async (query: ListInvitationsQuery = {}): Promise<Invitation[]> => {
    const res = await apiClient.get<Invitation[]>("/invitations", { params: query });
    return res.data;
  },

  create: async (input: CreateInviteInput): Promise<InvitationCreateResponse> => {
    const res = await apiClient.post<InvitationCreateResponse>("/invitations", input);
    return res.data;
  },

  revoke: async (id: string, input: DecideInput = {}): Promise<Invitation> => {
    const res = await apiClient.post<Invitation>(`/invitations/${id}/revoke`, input);
    return res.data;
  },

  approve: async (id: string, input: DecideInput = {}): Promise<Invitation> => {
    const res = await apiClient.post<Invitation>(`/invitations/${id}/approve`, input);
    return res.data;
  },

  reject: async (id: string, input: DecideInput = {}): Promise<Invitation> => {
    const res = await apiClient.post<Invitation>(`/invitations/${id}/reject`, input);
    return res.data;
  },

  getByToken: async (token: string): Promise<InvitationByTokenResponse> => {
    const res = await apiClient.get<InvitationByTokenResponse>(
      `/invitations/by-token/${encodeURIComponent(token)}`,
    );
    return res.data;
  },

  acceptByToken: async (token: string, input: AcceptByTokenInput) => {
    const res = await apiClient.post(
      `/invitations/by-token/${encodeURIComponent(token)}/accept`,
      input,
    );
    return res.data;
  },
};
