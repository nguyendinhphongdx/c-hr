import type { ID, ISODate } from "@/lib/types";

export type SsoProvider = "ENTRA";

export interface SsoConfig {
  id: ID;
  organizationId: ID;
  provider: SsoProvider;
  tenantId: string;
  clientId: string;
  hasClientSecret: boolean;
  isActive: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface UpsertSsoConfigInput {
  tenantId: string;
  clientId: string;
  /** Optional on update — when omitted, BE keeps the existing secret. */
  clientSecret?: string;
  isActive?: boolean;
}

export interface StartSsoResponse {
  authorizeUrl: string;
}
