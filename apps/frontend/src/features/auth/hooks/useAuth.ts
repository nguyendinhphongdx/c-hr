"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { resetSession } from "@/lib/api/client";
import { authService } from "../services/authService";
import { readNextFromLocation } from "../utils/safeNext";
import type {
  AppCode,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  OrgSignupInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyEmailConfirmInput,
  VerifyOtpInput,
} from "../types";

export const authKeys = {
  me: ["auth", "me"] as const,
};

/**
 * Reads /users/me — returns the user *with* their Organization and
 * AppAdmin grants. The me record is the canonical source of "what
 * Org am I in" and "what apps am I admin of" everywhere on the FE.
 */
export function useAuth() {
  const { data: me, isLoading, error } = useQuery({
    queryKey: authKeys.me,
    queryFn: authService.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: me ?? null,
    organization: me?.organization ?? null,
    appAdmins: me?.appAdmins ?? [],
    isLoading,
    isAuthenticated: !!me,
    error,
  };
}

/**
 * Mirror of common/auth/access.ts (BE) on the client side — same
 * hierarchy: sysowner ⊃ admin (Org) ⊃ appadmin ⊃ user. Used to gate
 * UI (hide nav items, disable buttons). Real authorization lives on
 * the server; client checks are presentation only.
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role === "sysowner") return true;
  return user.role === "admin";
}

export function useIsAppAdmin(app: AppCode): boolean {
  const { user, appAdmins } = useAuth();
  if (!user) return false;
  if (user.role === "sysowner" || user.role === "admin") return true;
  return appAdmins.some((g) => g.appCode === app);
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: () => {
      // Clear any stale refresh-failed flag from a previous expired
      // session so the next 401 in this fresh session can refresh again.
      resetSession();
      // Re-fetch /users/me — login response only carries the bare user.
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      router.push(readNextFromLocation());
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onSuccess: () => {
      resetSession();
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      router.push(readNextFromLocation());
    },
  });
}

/**
 * Org signup — creates Organization + the founding admin user in one
 * transaction (BE: POST /organizations/signup). On success the user is
 * already authenticated (BE set httpOnly cookies) and gets dropped at /home.
 */
export function useSignupOrg() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: OrgSignupInput) => authService.signupOrg(data),
    onSuccess: () => {
      resetSession();
      // Force /users/me re-fetch so organization + appAdmins land in the cache.
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      router.push(readNextFromLocation());
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
      // Re-arm the api client's refresh state so the next session can use it.
      resetSession();
      router.push("/login");
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordInput) => authService.forgotPassword(data),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordInput) => authService.resetPassword(data),
  });
}

export function useVerifyEmailConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VerifyEmailConfirmInput) =>
      authService.verifyEmailConfirm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useResendVerification() {
  return useMutation({ mutationFn: () => authService.verifyEmailResend() });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (data: VerifyOtpInput) => authService.verifyOtp(data),
    onSuccess: () => {
      resetSession();
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      router.push(readNextFromLocation());
    },
  });
}

export function useResendOtp() {
  return useMutation({ mutationFn: () => authService.resendOtp() });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) => authService.changePassword(data),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileInput) => authService.updateProfile(data),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

