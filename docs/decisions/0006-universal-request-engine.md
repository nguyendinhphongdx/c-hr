---
title: 'ADR 0006: Universal Request engine — RequestGroup + Request + side-effects'
description: One polymorphic table for every kind of request (leave, attendance correction, OT, OOO, …) instead of per-type tables. Validated by JSON fieldsSchema, dispatched on approve via a code-keyed registry.
tags: [project, adr, decision, requests, polymorphic, schema, side-effects]
---

# ADR 0006: Universal Request engine

- **Status**: Accepted (supersedes the per-type tables introduced in F4)
- **Date**: 2026-05-04
- **Deciders**: @nguyendinhphongdx

## Context

F4 implemented two separate Prisma tables — `LeaveRequest` and `AttendanceCorrection` — each with its own module, controller, service, repository, hooks, FE feature, list view, detail view, create form. The duplication was already heavy at two types; we expect more (đi muộn / về sớm tách riêng, đăng ký OT, đơn xin đi công tác, đăng ký work-from-home, …) and admin Org may want to define their own types in the future.

Two paths forward:

1. **Per-type tables** (status quo from F4) — copy module pattern N times.
2. **Universal request engine** — one `Request` table with `data: Json` validated against a schema living in `RequestGroup`. Side-effects on approve are dispatched by group code through a registry.

## Decision

**Adopt the universal engine.** Drop `LeaveRequest` + `AttendanceCorrection`; keep their data model as the *initial* set of `RequestGroup` rows.

### Schema

```prisma
model RequestGroup {
  id           String  @id @default(uuid())
  /// "leave" | "checkin" | "checkout" | (future: "out-of-office", "overtime", …)
  code         String  @unique
  name         String
  description  String?
  /// { fields: [{ key, label, type: "text|textarea|number|date|time|enum",
  ///              required?, options?, maxLength?, min?, max? }] }
  fieldsSchema Json    @map("fields_schema")
  isActive     Boolean @default(true)
  // timestamps...
  @@map("request_groups")
}

model Request {
  id             String        @id @default(uuid())
  organizationId String        @map("organization_id")
  groupId        String        @map("group_id")
  requesterId    String        @map("requester_id")    // → Employee
  approverId     String?       @map("approver_id")     // → Employee
  status         RequestStatus @default(PENDING)
  /// payload conforming to group.fieldsSchema; validated server-side on insert
  data           Json
  decisionNote   String?       @map("decision_note")
  decidedAt      DateTime?     @map("decided_at")
  // timestamps...
  @@map("requests")
}
```

### `fieldsSchema` shape

Self-built mini DSL — lighter than JSON Schema/Ajv but enough for HRM forms:

```json
{
  "fields": [
    {
      "key": "type",
      "label": "Loại nghỉ",
      "type": "enum",
      "required": true,
      "options": [
        { "value": "ANNUAL", "label": "Phép năm" },
        { "value": "SICK", "label": "Ốm" }
      ]
    },
    { "key": "startDate", "label": "Từ ngày", "type": "date", "required": true },
    { "key": "endDate", "label": "Đến ngày", "type": "date", "required": true },
    { "key": "reason", "label": "Lý do", "type": "textarea", "maxLength": 500 }
  ]
}
```

Supported types: `text`, `textarea`, `number`, `date`, `time`, `datetime`, `enum`. Per-field options: `required`, `options` (enum), `min`/`max` (number), `maxLength` (text/textarea), `helperText`.

### Validation

`apps/backend/src/apps/requests/request.validator.ts` — a ~80-line function that walks the schema and the incoming `data`. Returns the first error message in Vietnamese (the field `label`), or `null` for valid. No external dependency.

### Side-effect dispatch

```typescript
// apps/backend/src/apps/requests/side-effects/registry.ts
const HANDLERS: Record<string, RequestSideEffectHandler> = {
  checkin: applyCheckinCorrection,    // upsert attendance_logs.check_in_at
  checkout: applyCheckoutCorrection,  // upsert attendance_logs.check_out_at
  // 'leave' → no handler (deduct-balance is a future feature)
};
```

`RequestService.approve` looks up the handler by `request.group.code` and runs it inside the same Prisma `$transaction` as the status update — a thrown handler rolls back the approval, keeping `requests` and `attendance_logs` consistent.

Adding a new group with a side-effect:
1. Insert a `RequestGroup` row (seed file or, later, form-builder UI).
2. Add a handler entry to the registry.
3. (no DB migration, no new module).

### Authorisation & workflow

Same shape as F4 (intentionally unchanged):

- Requester must have `User.employeeId` set.
- Approver must come from `OrgChartService.getApproverCandidates(currentEmployee)`.
- State machine `PENDING → APPROVED | REJECTED | CANCELLED`. Reject requires `decisionNote`. Cancel only by requester while still `PENDING`.
- Decisions only by the assigned `approverId` — admin/sysowner do **not** auto-approve.
- HRM appadmin sees all requests in the Org via `scope=` filter; everyone else only sees own + assigned-to-approve.
- `@Auditable` on create/approve/reject/cancel — single action per row (`REQUEST_CREATE`, `REQUEST_APPROVE`, …).

### Group governance (MVP)

`RequestGroup` is **system-wide** (no `organizationId`) — one canonical schema per code shared across all Orgs. Seeded from `apps/backend/src/apps/requests/groups.config.ts` on every `prisma:seed` run (idempotent upsert).

API today is read-only; `RequestGroupController` exposes only `GET`. The form-builder UI for admin Org to author new groups is **F5.2** in [plans/features.md](../plans/features.md) — adds `POST/PATCH /request-groups` once the per-Org override path is decided (likely add `organizationId String?` for tenancy override and clone-on-write).

## Consequences

- **Positive**:
  - Adding a new request type (OOO, OT, …) = 1 row + optionally 1 handler. No new table, no new module, no new FE feature.
  - One inbox UI (`/requests` with master-detail layout) instead of one route per type. Users learn it once.
  - `DynamicForm` + `DynamicDataView` render any group's schema → zero hand-written form per type.
  - Side-effect registry localises the per-type DB writes (e.g. attendance log upsert) to one file, easy to grep when you need to know "what does approving X actually do?".
- **Negative**:
  - **Lose Prisma type safety on `data`**: the field is `Json` server-side; we manually narrow with helpers when we read it (e.g. side-effect handler `data as { date; requestedCheckInAt; reason }`). A typo there is a runtime error.
  - **Validation is duplicated**: BE validator + FE form rendering both consume the same `fieldsSchema`. They can drift if a field is renamed in the DB but the FE has a stale cache (we use TanStack Query staleTime to mitigate — `RequestGroup` query staleTime 5 minutes).
  - **No per-group queries on data fields** (e.g. "all leave with type=ANNUAL last quarter") without `data->>'type'` JSONB queries. Add Postgres expression indexes when a query becomes hot — the `(organizationId, groupId, status)` index already covers the common list cases.
  - **Migration was destructive**: F4 data dropped. Acceptable because F4 hadn't shipped.
- **Neutral**:
  - The 3 system-wide groups (`leave`, `checkin`, `checkout`) are seeded; a fresh DB always has them after `pnpm prisma:seed`.

## Alternatives considered

- **(rejected) Single-table inheritance with discriminator + per-type columns**: keeps Prisma type safety on common fields but pushes type-specific fields into `data: Json` anyway, just with extra denormalisation. Net loss.
- **(rejected) JSON Schema (Ajv) for validation**: industry-standard but more verbose than we need; the form-builder UI would have to expose JSON Schema's full surface. Self-built validator covers HRM field types in <100 lines.
- **(rejected) Side-effects via `@nestjs/event-emitter` listeners**: events are already emitted (for future MailService consumers) but are *async* — they can't fail the approve. Side-effects that mutate DB (attendance log upsert) need to be synchronous + transactional, hence the registry.

## Migration plan

1. **Drop** `leave_requests` + `attendance_corrections` tables (data lost — F4 hadn't shipped).
2. **Add** `request_groups` + `requests` (this ADR).
3. **Seed** the 3 default groups via `prisma/seed.ts`.
4. **Refactor BE**: delete `requests/leave-request/` + `requests/attendance-correction/`, replace with `requests/request/` + `requests/request-group/`. Wire side-effect registry in `RequestService.approve`.
5. **Refactor FE**: delete `features/leave/` + `features/attendance-correction/`, replace with `features/requests/` (DynamicForm + master-detail). Routes drop `/leave` + `/attendance-corrections`, add `/requests` + `/requests/new`. Sidebar gộp 1 link "Requests".

All committed in one PR / commit (`refactor(F5): universal Request engine`).

## References

- [Domain model — Request + RequestGroup](../domain.md)
- [F5 entry in plans/features.md](../plans/features.md)
- [ADR 0004 — orgchart approver candidates](0004-orgchart-source-of-truth.md) (drives `approverId` validation)
- [ADR 0002 — audit log](0002-audit-log.md) (single `REQUEST_*` action keys)
