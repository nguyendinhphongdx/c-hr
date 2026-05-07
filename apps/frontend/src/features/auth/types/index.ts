// Domain types for the auth feature.
// Schemas (zod) live with their forms; runtime types are inferred from the
// schemas via z.infer to avoid drift between validators and types.

import type { ID, ISODate, Nullable } from "@/lib/types";

export type Role = "sysowner" | "admin" | "user";
export type AppCode = "HRM";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type CalendarDefaultVisibility =
  | "DEFAULT"
  | "PUBLIC"
  | "PRIVATE"
  | "BUSY_ONLY";

export interface User {
  id: ID;
  email: string;
  name: Nullable<string>;
  avatar: Nullable<string>;
  /** Personal title set by the user (e.g. "Senior Engineer"). Distinct from
   *  the formal Employee.title set by HR. */
  title: Nullable<string>;
  /** Personal info — moved here from Employee. */
  dob: Nullable<ISODate>;
  gender: Nullable<Gender>;
  phone: Nullable<string>;
  role: Role;
  /** Null for sysowner. */
  organizationId: Nullable<ID>;
  /** Null until HR provisions the Employee record for this user. */
  employeeId: Nullable<ID>;
  /** USER-scope preferences map (e.g. `calendar.visibility`) — embedded
   *  on /me so the FE doesn't need a separate round-trip on app load.
   *  Generic key/value: keys live in BE `PREF_REGISTRY`. */
  preferences?: Record<string, unknown>;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface OrganizationSummary {
  id: ID;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
}

export interface AppAdminGrant {
  appCode: AppCode;
  organizationId: ID;
  createdAt: ISODate;
}

/** GET /users/me — user with eager relations. sysowner returns
 *  organization=null + appAdmins=[]; admin/user role inherit appadmin so
 *  appAdmins is empty by design for those too. */
export interface MeResponse extends User {
  organization: Nullable<OrganizationSummary>;
  appAdmins: AppAdminGrant[];
}

/** Login + signup return just the user — BE sets httpOnly cookies. */
export interface AuthResponse {
  user: User;
}

export type OAuthProvider = "github" | "google";

export interface LoginInput {
  email: string;
  password: string;
}

/** Legacy /auth/register input — boilerplate flow, kept while
 *  /organizations/signup becomes the canonical path. */
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
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileInput {
  name?: string;
  title?: Nullable<string>;
  avatar?: Nullable<string>;
  dob?: Nullable<string>;
  gender?: Nullable<Gender>;
  phone?: Nullable<string>;
}

// ──────────────────────────────────────────────────────────────────────
// Organization signup (Feature 1) — proper multi-tenant entry point.
// /register form collects these fields and POSTs /organizations/signup
// (creates Org + first admin User in one transaction).
// ──────────────────────────────────────────────────────────────────────

export interface OrgSignupInput {
  organizationName: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

/** /organizations/signup returns the new Org + the founder + tokens.
 *  BE also sets httpOnly cookies; FE doesn't need to read the tokens. */
export interface OrgSignupResponse {
  user: User;
  organization: OrganizationSummary;
}
