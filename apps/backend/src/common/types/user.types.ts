import { Role } from '@prisma/client';
import { Request } from 'express';

export interface IJwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  role: Role;
  /** Null for sysowner (no Org). */
  organizationId: string | null;
  /** Null until HR provisions the Employee record for this user. */
  employeeId: string | null;
}

export interface RequestUser {
  id: string;
  email: string;
  sessionId: string;
  role: Role;
  organizationId: string | null;
  employeeId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}
