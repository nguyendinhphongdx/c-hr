import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

export interface RequestContextData {
  userId?: string;
  sessionId?: string;
  /** Role of the authenticated user. Undefined when no auth. */
  role?: Role;
  /** Org of the current user. Null for sysowner. Undefined when no auth. */
  organizationId?: string | null;
  /** Linked Employee row id. Null if user is not yet linked. Undefined when no auth. */
  employeeId?: string | null;
  ip?: string;
  userAgent?: string;
}

/**
 * Per-request context backed by `nestjs-cls` (AsyncLocalStorage).
 *
 * Per ADR 0007, services consume the authenticated user from this object
 * instead of receiving a `currentUser` parameter. JwtStrategy.validate
 * populates the ctx after the user lookup; controllers under
 * @UseGuards(JwtAuthGuard) can rely on it being ready.
 *
 * Repositories must NOT inject this — they receive primitives explicitly
 * from services (ADR 0001).
 *
 * Background tasks (cron, event listeners, queue workers, CLI) run
 * outside an HTTP request and must wrap calls with `runInRequestContext`
 * if the called services need ctx data.
 */
@Injectable()
export class RequestContextService {
  constructor(private readonly cls: ClsService) {}

  // ──────────────────────────────────────────────────────────────────
  // Setters
  // ──────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────
  // Getters
  // ──────────────────────────────────────────────────────────────────

  get userId(): string | undefined {
    return this.cls.get('userId');
  }

  get sessionId(): string | undefined {
    return this.cls.get('sessionId');
  }

  get role(): Role | undefined {
    return this.cls.get('role');
  }

  get organizationId(): string | null | undefined {
    return this.cls.get('organizationId');
  }

  get employeeId(): string | null | undefined {
    return this.cls.get('employeeId');
  }

  get ip(): string | undefined {
    return this.cls.get('ip');
  }

  get userAgent(): string | undefined {
    return this.cls.get('userAgent');
  }

  // ──────────────────────────────────────────────────────────────────
  // Required-getters — throw when missing instead of returning undefined.
  // Use these when the caller is inside an authenticated route and wants
  // the value to be present (the throw is treated as a programmer error
  // for the rare miswiring case, otherwise an auth error for unauthed).
  // ──────────────────────────────────────────────────────────────────

  requireUserId(): string {
    const userId = this.userId;
    if (!userId) {
      throw new UnauthorizedException('Request is not authenticated');
    }
    return userId;
  }

  requireOrg(): string {
    const orgId = this.organizationId;
    if (!orgId) {
      throw new ForbiddenException('Current user is not attached to an organization');
    }
    return orgId;
  }

  requireEmployeeId(): string {
    const employeeId = this.employeeId;
    if (!employeeId) {
      throw new ForbiddenException(
        'Account is not linked to an employee — link via HRM admin first',
      );
    }
    return employeeId;
  }

  // ──────────────────────────────────────────────────────────────────
  // Permission helpers (sync — no DB). The async appadmin variant lives
  // in `common/auth/access.ts` because it needs PrismaService.
  // ──────────────────────────────────────────────────────────────────

  /**
   * Org-level admin check (sysowner OR admin of `orgId`). Mirrors
   * `common/auth/access.ts:isAdmin` but reads ctx instead of taking a
   * user param. See ADR 0003 + 0007.
   */
  isAdmin(orgId: string): boolean {
    if (this.role === 'sysowner') return true;
    return this.role === 'admin' && this.organizationId === orgId;
  }

  /**
   * Throws `ForbiddenException` if the current user is not Org admin
   * (or sysowner) for `orgId`. Returns void for ergonomic chaining.
   */
  requireAdmin(orgId: string): void {
    if (!this.isAdmin(orgId)) {
      throw new ForbiddenException('Need admin role for this organization');
    }
  }

  // ──────────────────────────────────────────────────────────────────

  getAll(): RequestContextData {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      role: this.role,
      organizationId: this.organizationId,
      employeeId: this.employeeId,
      ip: this.ip,
      userAgent: this.userAgent,
    };
  }
}
