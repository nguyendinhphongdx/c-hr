---
title: 'ADR 0007: Service reads from RequestContext, controllers stop threading currentUser'
description: Services consume the authenticated user via the AsyncLocalStorage RequestContextService instead of receiving a currentUser parameter from controllers. Repositories still take primitives explicitly. Background jobs / auth flow / CLI keep explicit params.
tags: [project, adr, decision, request-context, async-local-storage, nestjs-cls, layering]
---

# ADR 0007: Service reads from RequestContext, not param

- **Status**: Accepted
- **Date**: 2026-05-04
- **Deciders**: @nguyendinhphongdx

## Context

Today every service method accepts a `currentUser: RequestUser` parameter that the controller plucks via `@CurrentUser()` and forwards. After F1–F5 the cost is visible:

- Most service signatures repeat `(currentUser, ...)`.
- Service-to-service composition forwards `currentUser` through every call.
- The first lines of nearly every method are identical: `requireOrg(currentUser)`, `requireEmployeeId(currentUser)`.
- Background tasks (cron, event listeners, future BullMQ workers) that need to act on behalf of a user must fabricate a fake `RequestUser` to call services.

Codebase already has the right foundation: `nestjs-cls` integrated, `RequestContextService` exists at [`src/common/context/request-context.service.ts`](../../apps/backend/src/common/context/request-context.service.ts) with `userId / organizationId / sessionId / ip / userAgent`. The reference architecture (`ai-agent-builder`) uses the same pattern with Python `ContextVar` and explicitly carved out the same exception list (auth flow / workers / CLI).

## Decision

**Services consume the authenticated user from `RequestContextService` (AsyncLocalStorage), not from a parameter.** Controllers stop forwarding `currentUser` into service methods. Repositories continue to take explicit primitives.

### Layer responsibilities

| Layer | Auth source |
|---|---|
| Controller | `@UseGuards(JwtAuthGuard)` populates `request.user` and the ctx. No need to pass user into service. |
| Service | Inject `RequestContextService`. Read `ctx.userId / ctx.organizationId / ctx.role / ctx.employeeId`. |
| Repository | Receive primitives explicitly (`organizationId, filter`). **Never** inject ctx. |

### Helper API — methods on ctx (`Org-level checks, sync`)

```typescript
ctx.userId            // getter: string | undefined
ctx.role              // getter: Role | undefined
ctx.organizationId    // getter: string | null | undefined  (null = sysowner)
ctx.employeeId        // getter: string | null | undefined
ctx.sessionId         // getter
ctx.ip                // getter
ctx.userAgent         // getter

ctx.requireUserId()         // returns string, throws UnauthorizedException
ctx.requireOrg()            // returns string (orgId), throws ForbiddenException
ctx.requireEmployeeId()     // returns string, throws ForbiddenException

ctx.isAdmin(orgId): boolean         // sysowner OR (admin && organizationId === orgId)
ctx.requireAdmin(orgId): void       // throws ForbiddenException if not isAdmin
```

### Helper API — standalone functions for **app admin** check (needs DB)

`isAppAdmin` queries `app_admins` row, so it stays a function that takes ctx + Prisma — keeps `RequestContextService` free of DB dependencies:

```typescript
async function isAppAdmin(
  ctx: RequestContextService,
  app: AppCode,
  orgId: string,
  prisma: PrismaService,
): Promise<boolean>;

async function requireAppAdmin(
  ctx: RequestContextService,
  app: AppCode,
  orgId: string,
  prisma: PrismaService,
): Promise<void>;  // throws ForbiddenException
```

### Background tasks — explicit context

For code reachable from `setTimeout`, `EventEmitter` listeners, BullMQ workers, cron jobs, CLI commands, or webhook handlers (anywhere the HTTP request scope doesn't reach), wrap with:

```typescript
await runInRequestContext(
  { userId, organizationId, role, employeeId },
  async () => {
    // service.method(...) reads from ctx normally
  },
);
```

`runInRequestContext` lives in `src/common/context/run-in-request-context.ts` and is a thin wrapper around `ClsService.run({...}, fn)`.

### Where ctx is populated

`JwtStrategy.validate` (after looking up the user) calls `ctx.set({...})` so every controller path that goes through `JwtAuthGuard` has the ctx ready by the time the service method runs.

`@CurrentUser()` decorator stays — used by:
- Logging / audit interceptors that prefer reading the typed object directly.
- Edge cases where a controller needs the raw `RequestUser` shape.

It is **not** the canonical way to pipe the user into business logic any more.

## Consequences

- **Positive**:
  - Service signatures shrink: `list(query)` instead of `list(currentUser, query)`. ~1 less argument in dozens of methods.
  - Service-to-service composition stops forwarding user.
  - Tests: mock `RequestContextService` once instead of building `RequestUser` per case.
  - Background workers can wrap `runInRequestContext({...}, fn)` once and call any service inside.
  - Aligns with reference architecture (ai-agent-builder) — same pattern under different runtime.
- **Negative**:
  - **Hidden dependency** — service signature no longer screams "I need auth context". Mitigations: `tsdoc` on each public method, code review checklist, eventual lint rule.
  - TypeScript can't enforce ctx is populated. `requireUserId()` throws at runtime if missing. Acceptable: missing ctx = bug, throw early.
  - Easy to forget wrapping background tasks. Mitigation: ADR exception list is explicit, code review.
- **Neutral**:
  - `@CurrentUser()` decorator file kept for opt-in usage; not deprecated.

## Conventions / lint rules to add later

- New service: never accept `currentUser`/`RequestUser` as a parameter.
- Background-handler files (`*.handler.ts`, `*.cron.ts`, `*.cli.ts`): require `runInRequestContext()` wrapper or explicit `userId` parameter.
- ESLint custom rule (future): error on services that accept `RequestUser`.

## Migration plan (separate commit)

This ADR commits alone. The implementation lands in a follow-up commit `refactor(F6): services read from RequestContext`:

1. Extend `RequestContextService` with `role`, `employeeId` + getters + helper methods (`isAdmin`, `requireOrg`, `requireUserId`, `requireEmployeeId`, `requireAdmin`).
2. Refactor `common/auth/access.ts`: `isAppAdmin(currentUser, app, orgId, prisma)` → `isAppAdmin(ctx, app, orgId, prisma)` + add `requireAppAdmin`.
3. `JwtStrategy.validate` calls `ctx.set({...})` after DB lookup so the ctx is populated before the controller handler runs.
4. Add `runInRequestContext()` helper.
5. Refactor existing services 1-by-1 (employee, department, orgchart, app-admin, organization, user, work-schedule, attendance-log, attendance-device, timesheet, request, request-group) — drop `currentUser` parameter, read from injected `RequestContextService`.
6. Update controllers — call `service.method(dto)` instead of `service.method(currentUser, dto)`. Keep `@CurrentUser()` decorator file (no callers in controllers after refactor, but don't delete — opt-in for future audit/logging usecases).
7. Smoke E2E (login + Org / employee / request flows) before commit.

## Alternatives considered

- **(rejected) `Access` service injecting ctx + Prisma + exposing both sync and async checks**: cleaner separation but adds a layer most code only needs the sync part of. Methods on ctx + a couple of standalone functions reads cleaner.
- **(rejected) Status quo (param threading)**: rejected per the cost listed in Context.
- **(rejected) Decorator parameter (custom `@AuthContext()`)**: still threads a parameter — doesn't solve the service-to-service forwarding problem.

## References

- [src/common/context/request-context.service.ts](../../apps/backend/src/common/context/request-context.service.ts) — existing nestjs-cls wrapper, base for the methods added here.
- [ADR 0001](0001-tenant-isolation.md) — repository pattern (untouched: repos still take primitives).
- [ADR 0003](0003-no-permission-engine.md) — `isAppAdmin` helper signature changes here but semantics unchanged.
- [ai-agent-builder reference](../../README.md#mcp-documentation-server) — Python `ContextVar` pattern; same exception list (auth/workers/CLI).
