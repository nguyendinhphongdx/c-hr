---
title: Project conventions for Claude Code
description: Read this first. Concise rules of the road for any AI agent working in this codebase.
tags: [overview, conventions, claude]
---

# Project conventions for Claude Code

This file is the entry point for any AI agent (Claude Code, Cursor, Aider, etc.) working in this NestJS boilerplate. **Read it before making any change.**

For deeper detail, see [docs/](docs/README.md). All docs are also indexed in [docs/index.json](docs/index.json) and exposed through the local MCP server at [mcp/docs-server](mcp/docs-server/index.js). Use the MCP tools `docs_list`, `docs_search`, `docs_read` to look up specific topics on demand instead of reading the whole tree.

---

## Project at a glance

- **Project**: C-HR backend — API cho SaaS HRM (employees, departments, attendance, leave, payroll). Root monorepo: see [../../CLAUDE.md](../../CLAUDE.md).
- **Stack**: NestJS 10 + TypeScript + Prisma + PostgreSQL + Redis + JWT + Swagger + pnpm
- **Architecture**: layered — `config/` → `libs/` (infrastructure) → `common/` (cross-cutting) → `modules/` (features). HRM domain modules sống trong `src/modules/`.
- **Auth**: JWT in httpOnly cookies, header fallback (`Authorization: Bearer`)
- **Port**: `:8000` (FE expect tại đây). Swagger ở `/api/v1/docs` trong dev.
- **Domain conventions**: tất cả entity HR dùng UUID PK, snake_case plural table names, `created_at`/`updated_at` mặc định, soft-delete (`deleted_at` nullable) cho dữ liệu nhân sự nhạy cảm.

## Layout cheat sheet

```text
src/
├── main.ts             # bootstrap (CORS, Swagger, global pipes/filters)
├── app.module.ts       # composition root — import HrmModule, AttendanceModule, …
├── config/             # @nestjs/config namespaces (registerAs)
├── common/             # cross-cutting: filters, interceptors, guards, types, utils, auth helpers (isAppAdmin)
├── libs/               # infrastructure (@Global): database, redis, logger, mail, storage
├── apps/               # bounded contexts — đọc ADR 0005
│   ├── core/           # auth, user, organization (cross-cutting cho mọi app)
│   ├── platform/       # SYS_OWNER only (org list, billing-future)
│   ├── hrm/            # employee, department, orgchart, app-admin
│   ├── attendance/     # work-schedule, timesheet, attendance-log, attendance-device
│   └── requests/       # leave-request, attendance-correction
└── cli/                # `pnpm cli <name>` runner + commands
prisma/                 # schema + seed
scripts/                # one-off node scripts (build-docs-index, switch-db)
mcp/docs-server/        # local MCP server exposing docs to AI agents
docs/                   # human + agent docs (boilerplate/, project/, project/decisions/)
```

## Hard rules — DO NOT violate

1. **Never check secrets into git.** `.env` is gitignored; use `.env.example` for templates.
2. **Never modify `prisma/migrations/`** by hand. Always `pnpm prisma:migrate` to generate.
3. **DB naming**: tên cột snake_case, tên bảng snake_case plural. Code Prisma + TS dùng camelCase, mapping qua `@map("…")` + `@@map("…")`. Mọi bảng business **bắt buộc** có `created_at` (default `now()`) + `updated_at` (auto). PK = UUID v4. Soft-delete data nhân sự nhạy cảm: thêm `deleted_at DateTime?`. Xem [docs/project/domain.md → DB convention](docs/project/domain.md#db-convention-cứng).
4. **Folder structure**: feature module sống trong `src/apps/<bounded-context>/<module>/` (vd `src/apps/hrm/employee/`, `src/apps/attendance/timesheet/`). KHÔNG đẩy thẳng vào `src/modules/` cũ. Xem [ADR 0005](docs/project/decisions/0005-folder-structure-bounded-contexts.md).
5. **Tenant isolation**: mọi query Org-scoped phải qua `*Repository` với method `*ByOrg(organizationId, …)`. Bypass tenant chỉ được dùng method tên `*Raw(…)` rõ ràng. Xem [ADR 0001](docs/project/decisions/0001-tenant-isolation.md).
6. **Phân quyền**: KHÔNG `@RequirePermission` decorator, KHÔNG bảng permission. `User.role: sysowner | admin | user`. Service tự `if/else` dùng 2 helper: `isAdmin(user, orgId)` cho admin Org, `isAppAdmin(user, app, orgId)` cho appadmin per-app. Hierarchy bao gồm: admin/sysowner tự pass `isAppAdmin`. Xem [ADR 0003](docs/project/decisions/0003-no-permission-engine.md).
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
| Reused across ≥ 2 modules? | `common/` (utility) or `libs/` (infrastructure) |
| Wraps an external system? | `libs/<system>/` (e.g. `libs/redis`, `libs/storage`) |
| Per-request state? | `common/context/request-context.service.ts` |
| Validates HTTP input? | `*.dto.ts` (class + `class-validator`), under `common/types/` or `<module>/dto/` |
| Is type-only? | `*.types.ts` (interface / type alias), under `common/types/` or local to the feature |
| Configurable via env? | `config/<namespace>.config.ts` (`registerAs`) |

## Common commands

```bash
pnpm install
pnpm prisma:generate         # after schema.prisma changes
pnpm prisma:migrate          # create + apply migration
pnpm prisma:seed             # seed admin user
pnpm start:dev               # hot reload
pnpm build && pnpm start:prod
pnpm lint && pnpm format
pnpm test
pnpm cli <command>           # e.g. `pnpm cli seed`
pnpm db:switch <provider>    # postgresql | mysql | sqlite | sqlserver | mongodb
pnpm docs:index              # regenerate docs/index.json
```

## Two tiers of docs

- [docs/boilerplate/](docs/boilerplate/README.md) — framework patterns (architecture, conventions, recipes). **Don't edit unless changing the architecture.**
- [docs/project/](docs/project/README.md) — this project's domain, runbook, deployment. **You own these.**

When the user asks about *how the codebase works* → look in `boilerplate/`. When they ask about *what this app does* → look in `project/`.

## How to add things — quick pointers (boilerplate-level)

- **New feature module** → [docs/boilerplate/recipes/add-module.md](docs/boilerplate/recipes/add-module.md)
- **New CLI command** → [docs/boilerplate/recipes/add-cli-command.md](docs/boilerplate/recipes/add-cli-command.md)
- **Switch database** → [docs/boilerplate/recipes/switch-database.md](docs/boilerplate/recipes/switch-database.md)
- **Storage provider** (S3/GCS) → [docs/boilerplate/recipes/storage-providers.md](docs/boilerplate/recipes/storage-providers.md)
- **Auth + cookies** → [docs/boilerplate/recipes/auth-and-cookies.md](docs/boilerplate/recipes/auth-and-cookies.md)

## Required reading by topic

- Layered architecture, DI, request lifecycle → [docs/boilerplate/architecture.md](docs/boilerplate/architecture.md)
- Naming, file organization, do/don't lists → [docs/boilerplate/conventions.md](docs/boilerplate/conventions.md)
- All env vars → [docs/boilerplate/reference/env-vars.md](docs/boilerplate/reference/env-vars.md)
- What's injectable globally (no import needed) → [docs/boilerplate/reference/globals.md](docs/boilerplate/reference/globals.md)

## Subagents available

Two specialized subagents live in `.claude/agents/`. Use them via the `Agent` tool:

| When to invoke | Subagent | What it does |
| --- | --- | --- |
| User says "review", "audit", "check this change", or after a non-trivial edit | `code-reviewer` | Diffs the branch, walks the conventions checklist, runs lint+build, returns a tight report |
| User says "create a module", "scaffold X", "add a CRUD resource for Y" | `module-scaffolder` | Asks clarifying questions, scaffolds the module per the recipe, registers it in `AppModule`, runs build |

Each subagent has its own constrained tool set and reads the relevant docs before acting. **Don't replicate their work in the main thread** — delegate. They return a summary; you relay it to the user.

## Tooling shortcuts

- **MCP server**: `boilerplate-docs` (auto-registered via [.mcp.json](.mcp.json)) — call `docs_list`, `docs_search`, `docs_read` instead of grepping markdown.
- **Hooks**: a PostToolUse hook auto-rebuilds `docs/index.json` whenever you edit `CLAUDE.md`, `AGENTS.md`, or any `docs/**/*.md`. You don't need to run `pnpm docs:index` manually.
- **Permissions allowlist** (`.claude/settings.json`) auto-approves safe commands (`pnpm build`, `pnpm test`, `git status`, `git diff`, `node scripts/*.js`, …). Destructive ops (`git push`, `git reset --hard`, `rm -rf $HOME`) are explicitly denied.

## Workflow expectations for AI agents

1. **Before editing**, read the relevant recipe or convention doc. Prefer the `docs_search` MCP tool over grepping by hand.
2. **After schema change**, run `pnpm prisma:generate` before claiming the change works.
3. **After adding a feature module**, register it in [src/app.module.ts](src/app.module.ts).
4. **Verify with `pnpm build`** before reporting done — TypeScript catches the easy mistakes.
5. **Delegate to subagents** when the task fits one of them. Don't do their job in the main thread.
6. **Don't fabricate file paths** — if unsure, use Read or `Glob` first.
7. **Don't run `pnpm docs:index` manually** — the hook handles it.
