---
title: 'ADR 0008: Entity ACL pattern (BaseAcl + ambient ctx)'
description: How object-level permissions are expressed and consumed in C-HR. Implements ADR 0003 (no permission engine) at the entity level.
tags: [project, adr, decision, acl, authorization]
---

# ADR 0008: Entity ACL pattern (BaseAcl + ambient ctx)

- **Status**: Accepted
- **Date**: 2026-05-06
- **Deciders**: @phongnd
- **Supersedes**: —
- **Relates to**: [ADR 0003 (no permission engine)](0003-no-permission-engine.md), [ADR 0007 (services read RequestContext)](0007-service-reads-request-context.md)

## Context

Action-level checks (`isAdmin`, `requireAppAdmin`) cover "who can call this endpoint at all". They don't cover "given this row, can the current user view/edit/delete it?" We needed a place to centralize per-row rules without:

- a permission engine / decorator registry / CASL-style DSL (rejected by [ADR 0003](0003-no-permission-engine.md));
- multiple `canEditEmployee / canDeleteEmployee / canViewEmployee` free functions scattered across the codebase;
- threading `ctx` and `prisma` through every signature for every helper.

We also wanted the result to be cheap on the hot path (a list endpoint that calls ACL once per row should not trigger one DB query per row).

## Decision

Per-entity **`BaseAcl<T, V>`** subclass + **ambient context**.

1. **Ambient ctx via CLS.** [`RequestContextService.current()`](../../apps/backend/src/common/context/request-context.service.ts) is a static accessor reading the per-request store (nestjs-cls / AsyncLocalStorage). ACL classes don't take `ctx` in their constructors — they read it via a `protected get ctx()` getter on `BaseAcl`.

2. **Role data baked into ctx at auth time.** [`JwtStrategy.validate`](../../apps/backend/src/apps/core/auth/strategies/jwt.strategy.ts) loads the user's `AppAdmin[]` rows once and stores `appAdminCodes: AppCode[]` in the CLS store. `RequestContextService.isAppAdmin(app, orgId)` is therefore **sync** — no DB round-trip per ACL call.

3. **`BaseAcl<T, V extends AclView>`.** Constructor takes only the entity object. Subclasses implement `canView() / canEdit() / canDelete()` (sync where possible, `Promise<boolean>` allowed for the rare ACL needing extra DB lookup). Inherited:
   - `getAcl()` aggregates the three predicates into the view object — memoized, parallel, runs each predicate at most once.
   - `require(action)` throws `ForbiddenException` if denied.
   - Custom flags (e.g. `canApprove`, `canViewLogs`) come from extending `AclView` via the second generic and overriding `getAcl()` to merge.

4. **Service usage**: fetch the row, instantiate `new EntityAcl(row)`, then `await acl.require('canEdit')` for write paths or attach `view: await acl.getAcl()` to detail responses so the FE can hide buttons without re-implementing rules.

Single source of truth: one ACL file per entity; one `RequestContextService` for ambient context; no engine to teach.

## Consequences

- **Positive**:
  - One file = one entity = one place to grep when a permission feels wrong.
  - Hot-path list endpoints stay cheap — `acl.canEdit()` is a sync set lookup (`appAdminCodes.includes('HRM')`).
  - FE consumes `view: { canEdit, canDelete, ... }` directly; no rule duplication across stacks.
  - Test ACL classes as plain unit tests — no NestJS `TestingModule`, just construct with mock obj and `RequestContextService.current()` set via CLS run.
- **Negative**:
  - Rules baked into ctx don't refresh mid-request. Granting/revoking AppAdmin to oneself in the same request won't take effect until the next auth cycle. Acceptable — this case is rare and the next request reflects the change.
  - Two static accessors are global state (`ctx` via CLS, no others). Tests must set CLS before invoking ACL.
- **Neutral**: Action-level checks (`requireAppAdmin` for endpoints with no row, e.g. `create`) keep the existing helper at [`common/auth/access.ts`](../../apps/backend/src/common/auth/access.ts). They coexist; entity ACL is opt-in for row-level decisions.

## Alternatives considered

- **Plain functions (`canEditEmployee(ctx, prisma, emp)`)** — too many free functions per entity; user pushback on noise.
- **Closure factory (`employeeAcl(ctx, prisma, emp).canEdit()`)** — closures + lazy memoization work, but inheritance gives shared `getAcl/require` semantics for free, and ambient ctx removes the `ctx` arg.
- **Active Record–style `BaseEntity` (Rails Pundit, like rework-talent's `apps/api/src/common/domain`)** that wraps Prisma data + holds `getAcl()` + `toResponse()`. Cleaner long-term; not adopted yet because most C-HR responses still return raw Prisma rows. Re-evaluate when reshape of responses becomes systematic.
- **Permission engine / @CanI decorators / CASL** — rejected by [ADR 0003](0003-no-permission-engine.md); too much magic.
- **AppAdmin lookup per ACL call (async)** — first iteration. Dropped because `appAdminCodes` baked into ctx makes the same check sync and works for every row in a list endpoint with one auth-time query.

## References

- [`apps/backend/src/common/acl/base-acl.ts`](../../apps/backend/src/common/acl/base-acl.ts) — base class.
- [`apps/backend/src/apps/hrm/employee/employee.acl.ts`](../../apps/backend/src/apps/hrm/employee/employee.acl.ts) — first concrete ACL.
- [`docs/backend/recipes/add-entity-acl.md`](../backend/recipes/add-entity-acl.md) — recipe to add an ACL to a new entity.
