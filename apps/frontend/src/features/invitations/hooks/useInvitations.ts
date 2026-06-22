"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invitationService } from "../services/invitationService";
import type {
  AcceptByTokenInput,
  CreateInviteInput,
  DecideInput,
  ListInvitationsQuery,
} from "../types";

export const invitationKeys = {
  list: (query: ListInvitationsQuery = {}) =>
    ["invitations", "list", query] as const,
  byToken: (token: string) => ["invitations", "by-token", token] as const,
};

export function useInvitations(query: ListInvitationsQuery = {}) {
  return useQuery({
    queryKey: invitationKeys.list(query),
    queryFn: () => invitationService.list(query),
    staleTime: 30 * 1000,
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInviteInput) => invitationService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: DecideInput }) =>
      invitationService.revoke(id, input ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useApproveInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: DecideInput }) =>
      invitationService.approve(id, input ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useRejectInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: DecideInput }) =>
      invitationService.reject(id, input ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useInvitationByToken(token: string | null) {
  return useQuery({
    queryKey: token
      ? invitationKeys.byToken(token)
      : ["invitations", "by-token", "none"],
    queryFn: () => invitationService.getByToken(token as string),
    enabled: !!token,
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useAcceptByToken() {
  return useMutation({
    mutationFn: ({ token, input }: { token: string; input: AcceptByTokenInput }) =>
      invitationService.acceptByToken(token, input),
  });
}
