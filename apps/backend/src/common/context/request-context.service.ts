import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

export interface RequestContextData {
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Request Context Service
 * Provides per-request context using AsyncLocalStorage (nestjs-cls)
 */
@Injectable()
export class RequestContextService {
  constructor(private readonly cls: ClsService) {}

  set(data: Partial<RequestContextData>) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) this.cls.set(key, value);
    });
  }

  setUserId(userId: string) {
    this.cls.set('userId', userId);
  }

  setSessionId(sessionId: string) {
    this.cls.set('sessionId', sessionId);
  }

  get userId(): string | undefined {
    return this.cls.get('userId');
  }

  get sessionId(): string | undefined {
    return this.cls.get('sessionId');
  }

  get ip(): string | undefined {
    return this.cls.get('ip');
  }

  get userAgent(): string | undefined {
    return this.cls.get('userAgent');
  }

  get requireUserId(): string {
    const userId = this.userId;
    if (!userId) throw new Error('userId not set in request context');
    return userId;
  }

  getAll(): RequestContextData {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      ip: this.ip,
      userAgent: this.userAgent,
    };
  }
}
