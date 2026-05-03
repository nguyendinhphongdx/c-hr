"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { resetSession } from "@/lib/api/client";
import { authService } from "../services/authService";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyEmailConfirmInput,
  VerifyOtpInput,
} from "../types";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: authKeys.me,
    queryFn: authService.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: (res) => {
      queryClient.setQueryData(authKeys.me, res.user);
      router.push(res.user.is_verified ? "/home" : "/verify-email/pending");
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onSuccess: (res) => {
      queryClient.setQueryData(authKeys.me, res.user);
      router.push("/verify-email/pending");
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
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      router.push("/home");
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
