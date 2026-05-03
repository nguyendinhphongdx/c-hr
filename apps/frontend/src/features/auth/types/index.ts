// Domain types for the auth feature.
// Schemas (zod) live with their forms; runtime types are inferred from the
// schemas via z.infer to avoid drift between validators and types.

import type { ID, ISODate, Nullable } from "@/lib/types";

export interface User {
  id: ID;
  email: string;
  full_name: Nullable<string>;
  avatar_url: Nullable<string>;
  is_verified: boolean;
  created_at: ISODate;
}

export interface AuthResponse {
  user: User;
}

export type OAuthProvider = "github" | "google";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  new_password: string;
}

export interface VerifyEmailConfirmInput {
  code: string;
}

/** Channel-agnostic OTP — backend chooses email or SMS based on user setup. */
export interface VerifyOtpInput {
  code: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  avatar_url?: Nullable<string>;
}
