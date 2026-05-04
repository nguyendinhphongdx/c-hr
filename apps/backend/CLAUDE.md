---
title: C-HR backend — entry point cho AI agents
description: Trỏ về docs/ ở root. Đọc trước khi sửa code trong apps/backend/.
tags: [overview, conventions, claude, c-hr, backend]
---

# C-HR backend — entry point

Đây là entry point cho AI agent khi làm việc trong [apps/backend/](.). Tài liệu kiến trúc + quy ước **không** sống ở đây — chúng ở [docs/](../../docs/) (single source of truth cho cả monorepo).

> Nếu bạn đang đọc file này, bước tiếp theo: open [docs/backend/](../../docs/backend/README.md) cho NestJS-specific patterns, [docs/domain.md](../../docs/domain.md) cho HRM domain, [docs/decisions/](../../docs/decisions/) cho ADR đã chốt.

## Project at a glance

- **Project**: C-HR backend — API cho SaaS HRM (employees, departments, attendance, leave, payroll). Root monorepo: [../../CLAUDE.md](../../CLAUDE.md).
- **Stack**: NestJS 10 + TypeScript + Prisma + PostgreSQL + Redis + JWT + Swagger + pnpm.
- **Architecture**: layered — `config/` → `libs/` (infrastructure) → `common/` (cross-cutting) → `apps/<bounded-context>/<module>/` (features). Xem [ADR 0005](../../docs/decisions/0005-folder-structure-bounded-contexts.md).
- **Auth**: JWT in httpOnly cookies, header fallback (`Authorization: Bearer`).
- **Port**: `:8000` (FE expect tại đây). Swagger ở `/api/v1/docs` trong dev.

## Layout (sau khi Foundation feature 0 chạy xong)

```text
src/
├── main.ts             # bootstrap (CORS, Swagger, global pipes/filters)
├── app.module.ts       # composition root — import HrmModule, AttendanceModule, …
├── config/             # @nestjs/config namespaces (registerAs)
├── common/             # cross-cutting: filters, interceptors, guards, types, utils, auth helpers (isAdmin, isAppAdmin)
├── libs/               # infrastructure (@Global): database, redis, logger, mail, storage
├── apps/               # bounded contexts — đọc ADR 0005
│   ├── core/           # auth, user (cross-cutting cho mọi app)
│   ├── platform/       # SYS_OWNER only (org list, billing-future)
│   ├── hrm/            # employee, department, orgchart, app-admin
│   ├── attendance/     # work-schedule, timesheet, attendance-log, attendance-device
│   └── requests/       # leave-request, attendance-correction
└── cli/                # `pnpm cli <name>` runner + commands
prisma/                 # schema + seed
scripts/                # one-off node scripts (init-project, switch-db)
```

> **Hiện tại** chỉ có `src/apps/core/{auth,user,health}`. Bounded context mới (`platform`, `hrm`, `attendance`, `requests`) sẽ thêm theo [docs/plans/features.md](../../docs/plans/features.md) Feature 1+.

## Hard rules — DO NOT violate

1. **Never check secrets into git.** `.env` is gitignored; use `.env.example` for templates.
2. **Never modify `prisma/migrations/`** by hand. Always `pnpm prisma:migrate` to generate.
3. **DB convention** — xem [docs/domain.md → DB convention](../../docs/domain.md#db-convention-cứng): tên cột snake_case, tên bảng snake_case plural. Code Prisma + TS dùng camelCase, mapping qua `@map("…")` + `@@map("…")`. Mọi bảng business **bắt buộc** có `created_at` (default `now()`) + `updated_at` (auto). PK = UUID v4. Soft-delete data nhân sự nhạy cảm: thêm `deleted_at DateTime?`.
4. **Folder structure**: feature module sống trong `src/apps/<bounded-context>/<module>/`. Xem [ADR 0005](../../docs/decisions/0005-folder-structure-bounded-contexts.md).
5. **Tenant isolation**: mọi query Org-scoped phải qua `*Repository` với method `*ByOrg(organizationId, …)`. Bypass tenant chỉ được dùng method tên `*Raw(…)` rõ ràng. Xem [ADR 0001](../../docs/decisions/0001-tenant-isolation.md).
6. **Phân quyền**: KHÔNG `@RequirePermission` decorator, KHÔNG bảng permission. `User.role: sysowner | admin | user`. Service tự `if/else` dùng 2 helper: `isAdmin(user, orgId)` cho admin Org, `isAppAdmin(user, app, orgId)` cho appadmin per-app. Hierarchy bao gồm: admin/sysowner tự pass `isAppAdmin`. Xem [ADR 0003](../../docs/decisions/0003-no-permission-engine.md).
7. **Never put framework-agnostic helpers in feature modules.** Cross-cutting code goes in `common/` or `libs/`.
8. **Never bypass `class-validator` for HTTP input.** Define a DTO; the global `ValidationPipe` enforces it.
9. **Never throw raw `Error` in HTTP handlers.** Use `@nestjs/common` HttpExceptions or `AccessException`.
10. **Don't add a new dependency without justifying it.** Prefer the standard library / already-installed deps.
11. **Don't introduce a new top-level folder** without updating `tsconfig.json` paths and this file.
12. **Don't write business logic in controllers.** Controllers are thin: validate, delegate to a service, return.
13. **Don't use `console.log` in committed code.** Use `Logger` from `@nestjs/common` (or `LoggerService` from `libs/logger`).
14. **Don't write comments that narrate code.** Comments explain *why* (a non-obvious constraint), never *what*.

## When to put code where

| Question | Answer |
| --- | --- |
| Reads/writes data? | `*.service.ts` inside the relevant feature module |
| HTTP route? | `*.controller.ts` inside the feature module |
| Reused across ≥ 2 modules trong cùng context? | barrel của context (`src/apps/<context>/<context>.module.ts` exports) |
| Reused cross-context? | `common/` (utility) hoặc `libs/` (infrastructure) |
| Wraps an external system? | `libs/<system>/` (e.g. `libs/redis`, `libs/storage`) |
| Per-request state? | `common/context/request-context.service.ts` |
| Validates HTTP input? | `*.dto.ts` (class + `class-validator`), under `common/types/` or `<module>/dto/` |
| Is type-only? | `*.types.ts` (interface / type alias), under `common/types/` or local to the feature |
| Configurable via env? | `config/<namespace>.config.ts` (`registerAs`) |

## Common commands

Chạy từ root C-HR (preferred — workspace), hoặc trực tiếp trong `apps/backend/`.

```bash
pnpm --filter @c-hr/backend prisma:generate     # after schema.prisma changes
pnpm --filter @c-hr/backend prisma:migrate      # create + apply migration
pnpm --filter @c-hr/backend prisma:seed         # seed admin user
pnpm --filter @c-hr/backend start:dev           # hot reload
pnpm --filter @c-hr/backend build && pnpm --filter @c-hr/backend start:prod
pnpm --filter @c-hr/backend lint && pnpm --filter @c-hr/backend format
pnpm --filter @c-hr/backend test
pnpm --filter @c-hr/backend cli <command>       # e.g. seed
pnpm --filter @c-hr/backend db:switch <provider>
```

## Required reading by topic

- HRM domain (entity + invariant) → [docs/domain.md](../../docs/domain.md)
- Layered architecture, DI, request lifecycle → [docs/backend/architecture.md](../../docs/backend/architecture.md)
- Naming, file organization, do/don't lists → [docs/backend/conventions.md](../../docs/backend/conventions.md)
- All env vars → [docs/backend/reference/env-vars.md](../../docs/backend/reference/env-vars.md)
- What's injectable globally (no import needed) → [docs/backend/reference/globals.md](../../docs/backend/reference/globals.md)
- Active work → [docs/plans/features.md](../../docs/plans/features.md)

## Subagents available

Đăng ký ở root [.claude/agents/](../../.claude/agents/). Dùng qua `Agent` tool:

| When to invoke | Subagent | What it does |
| --- | --- | --- |
| User says "review", "audit", "check this change", or after a non-trivial edit | `code-reviewer` | Diffs the branch, walks the conventions checklist (BE+FE), runs verifications, returns a tight report |
| User says "create a module", "scaffold X", "add a CRUD resource for Y" (BE) | `module-scaffolder` | Asks clarifying questions, scaffolds the module per the recipe, registers it, runs build |

## Tooling shortcuts

- **MCP server**: `c-hr-docs` (root [.mcp.json](../../.mcp.json)) — call `docs_list`, `docs_search`, `docs_read` instead of grepping markdown.
- **Hooks**: PostToolUse hook ở root [.claude/settings.json](../../.claude/settings.json) auto-rebuild `docs/index.json` khi edit MD.
- **Permissions allowlist** ở root [.claude/settings.json](../../.claude/settings.json) auto-approve safe commands. Destructive ops bị deny.

## Workflow expectations for AI agents

1. **Before editing**, read the relevant recipe or convention doc trong [docs/backend/](../../docs/backend/). Prefer `docs_search` MCP tool over grepping by hand.
2. **After schema change**, run `pnpm --filter @c-hr/backend prisma:generate` before claiming the change works.
3. **After adding a feature module**, register it in the bounded-context barrel (`apps/<context>/<context>.module.ts`).
4. **Verify with `pnpm --filter @c-hr/backend build`** before reporting done.
5. **Delegate to subagents** when the task fits one of them.
6. **Don't fabricate file paths** — use Read or Glob first.
7. **Don't run `pnpm docs:index` manually** — the hook handles it.
