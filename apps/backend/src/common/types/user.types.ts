import { Request } from 'express';

export interface IJwtPayload {
  sub: string;
  email: string;
  sessionId: string;
}

export interface RequestUser {
  id: string;
  email: string;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}
