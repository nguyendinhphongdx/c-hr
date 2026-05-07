import { apiClient } from "@/lib/api/client";
import type {
  AuthResponse,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  MeResponse,
  OAuthProvider,
  OrgSignupInput,
  OrgSignupResponse,
  RegisterInput,
  ResetPasswordInput,
  UpdateCalendarSettingsInput,
  UpdateProfileInput,
  User,
  VerifyEmailConfirmInput,
  VerifyOtpInput,
} from "../types";

export const authService = {
  login: async (data: LoginInput): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>("/auth/login", data);
    return res.data;
  },

  register: async (data: RegisterInput): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>("/auth/register", data);
    return res.data;
  },

  signupOrg: async (data: OrgSignupInput): Promise<OrgSignupResponse> => {
    const res = await apiClient.post<OrgSignupResponse>(
      "/organizations/signup",
      data,
    );
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  /**
   * Logged-in user + their Organization + AppAdmin grants in one round
   * trip. Backed by GET /users/me (apps/backend F1.6).
   */
  getMe: async (): Promise<MeResponse> => {
    const res = await apiClient.get<MeResponse>("/users/me");
    return res.data;
  },

  forgotPassword: async (
    data: ForgotPasswordInput,
  ): Promise<{ sent: true }> => {
    await apiClient.post("/auth/forgot-password", data);
    return { sent: true };
  },

  resetPassword: async (data: ResetPasswordInput): Promise<{ ok: true }> => {
    await apiClient.post("/auth/reset-password", data);
    return { ok: true };
  },

  verifyEmailConfirm: async (
    data: VerifyEmailConfirmInput,
  ): Promise<{ verified: true }> => {
    await apiClient.post("/auth/verify-email", data);
    return { verified: true };
  },

  verifyEmailResend: async (): Promise<{ sent: true }> => {
    await apiClient.post("/auth/verify-email/resend");
    return { sent: true };
  },

  /**
   * OTP verification — channel-agnostic (email or SMS). The BE decides which
   * channel was used at request time; the FE just hands over the code.
   */
  verifyOtp: async (data: VerifyOtpInput): Promise<{ verified: true }> => {
    await apiClient.post("/auth/verify-otp", data);
    return { verified: true };
  },

  resendOtp: async (): Promise<{ sent: true }> => {
    await apiClient.post("/auth/verify-otp/resend");
    return { sent: true };
  },

  changePassword: async (data: ChangePasswordInput): Promise<{ success: true }> => {
    const res = await apiClient.patch<{ success: true }>("/users/me/password", data);
    return res.data;
  },

  updateProfile: async (data: UpdateProfileInput): Promise<User> => {
    const res = await apiClient.patch<User>("/users/me", data);
    return res.data;
  },

  updateCalendarSettings: async (
    data: UpdateCalendarSettingsInput,
  ): Promise<User> => {
    const res = await apiClient.patch<User>("/users/me/calendar-settings", data);
    return res.data;
  },
};

export function oauthStartUrl(
  provider: OAuthProvider,
  redirectTo?: string,
): string {
  const base = apiClient.defaults.baseURL ?? "";
  const url = new URL(`${base}/auth/oauth/${provider}/start`);
  if (redirectTo) url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}
