---
title: C-HR — Project conventions for AI agents (root)
description: Navigation hub. Trỏ xuống CLAUDE.md của apps/backend và apps/frontend, và docs/ là single source of truth.
tags: [overview, conventions, claude, c-hr]
---

# C-HR — Conventions for AI agents (root)

C-HR (**C-OpenAI Human Resource**) là SaaS quản lý nhân sự cho doanh nghiệp. Đây là **root navigation hub** cho monorepo. Mọi tài liệu kiến trúc/quy ước/ADR/plan đều sống ở [docs/](docs/) (single source of truth, không nhân bản theo app).

## Project at a glance

- **Domain**: HRM (employees, departments, attendance, leave, payroll). Entity + invariants ở [docs/domain.md](docs/domain.md).
- **Stack**: Next.js 16 (frontend) + NestJS 10 (backend) + Postgres 16 + Redis 7
- **Layout**:
  - [apps/backend](apps/backend/) — NestJS + Prisma + Postgres + Redis. Conventions: [docs/backend/](docs/backend/).
  - [apps/frontend](apps/frontend/) — Next.js 16 + Tailwind 4 + shadcn/ui (Radix Nova) + TanStack Query. Conventions: [docs/frontend/](docs/frontend/).
  - [services/postgres](services/postgres/) — Postgres 16 dev container.
  - [services/redis](services/redis/) — Redis 7 dev container.
  - [scripts/dev.sh](scripts/dev.sh) — CLI quản lý docker compose + dev workflows.
  - [mcp/docs-server](mcp/docs-server/) — MCP server expose docs cho AI agent.
- **Port mặc định**: BE `:8000`, FE `:3000`, Postgres `:5432`, Redis `:6379`.

## Khi user yêu cầu, đọc đúng tài liệu

| Phạm vi yêu cầu | File phải đọc trước |
|---|---|
| HRM domain (entity, invariant, constraint) | [docs/domain.md](docs/domain.md) (BE) + [docs/frontend/domain.md](docs/frontend/domain.md) (UX, route map) |
| Backend module / Prisma / NestJS | [apps/backend/CLAUDE.md](apps/backend/CLAUDE.md) → [docs/backend/](docs/backend/README.md) |
| Frontend page / feature / component | [apps/frontend/CLAUDE.md](apps/frontend/CLAUDE.md) → [docs/frontend/](docs/frontend/README.md) |
| Quyết định kiến trúc đã chốt | [docs/decisions/](docs/decisions/) |
| Việc đang/sắp làm | [docs/plans/refactor.md](docs/plans/refactor.md) + [docs/plans/features.md](docs/plans/features.md) |
| Docker / orchestration / services | File này |
| Vận hành dev local + on-call | [docs/runbook.md](docs/runbook.md) |
| Deploy production | [docs/deployment.md](docs/deployment.md) |

**Tuyệt đối không** copy tài liệu xuống các app — `apps/<name>/` chỉ chứa code, README, và CLAUDE.md (entry point trỏ về `docs/`).

## Cross-cutting hard rules (root)

1. **`.env` không commit.** Root không có `.env` — `docker-compose.yml` dùng `env_file: ./apps/backend/.env` cho BE container và `include:` infra service từ `services/*` (postgres/redis dùng default). Mỗi app có template `.env.example` riêng: `apps/backend/.env.example` + `apps/frontend/.env.example`.
2. **Dockerfile / docker-compose** chỉ sửa khi orchestration thay đổi. Khi thêm service mới, theo pattern: `services/<name>/docker-compose.yml` + extends trong root compose.
3. **`scripts/dev.sh`** là entry point thống nhất cho dev. Đừng viết script riêng tản mác — bổ sung command vào file này.
4. **MCP server** — root [.mcp.json](.mcp.json) đăng ký 1 server `c-hr-docs` ([mcp/docs-server](mcp/docs-server/)). Dùng `docs_list / docs_search / docs_read` thay vì grep markdown.
5. **Docs index** — `docs/index.json` được rebuild tự động bởi PostToolUse hook trong [.claude/settings.json](.claude/settings.json) khi bạn edit MD file. Manual: `pnpm docs:index`.

## Common commands (root)

```bash
./scripts/dev.sh help                # tất cả lệnh
./scripts/dev.sh start infra         # postgres + redis
./scripts/dev.sh dev backend         # nest start --watch (native)
./scripts/dev.sh dev frontend        # next dev (native)
./scripts/dev.sh start:dev all       # full stack với BE hot-reload (Docker)
./scripts/dev.sh migrate             # prisma migrate dev
./scripts/dev.sh logs backend
./scripts/dev.sh stop                # stop tất cả container
pnpm install                         # workspace install (root)
pnpm --filter @c-hr/backend build
pnpm --filter @c-hr/frontend check
pnpm docs:index                      # rebuild docs/index.json
```

## Đường nét thư mục

```
.
├── apps/
│   ├── backend/              # NestJS — entry: apps/backend/CLAUDE.md
│   └── frontend/             # Next.js — entry: apps/frontend/CLAUDE.md
├── services/
│   ├── postgres/             # standalone postgres compose
│   └── redis/                # standalone redis compose
├── docs/                     # single source of truth — kiến trúc, quy ước, ADR, plan
│   ├── domain.md             # HRM business domain (entity, invariant)
│   ├── runbook.md            # on-call + dev local
│   ├── deployment.md         # production
│   ├── backend/              # NestJS-specific (architecture, conventions, recipes, reference)
│   ├── frontend/             # Next.js-specific + UX domain (domain.md route map)
│   ├── decisions/            # ADRs (0001..)
│   └── plans/                # refactor.md + features.md
├── mcp/docs-server/          # 1 MCP server cho cả monorepo
├── scripts/
│   ├── dev.sh                # dev CLI
│   ├── build-docs-index.js   # docs indexer
│   └── hooks/post-edit-docs.js  # PostToolUse hook
├── .claude/
│   ├── settings.json         # permissions + hooks
│   └── agents/               # code-reviewer, module-scaffolder (BE), page-scaffolder (FE)
├── docker-compose.yml        # root: include services/{postgres,redis} + backend (env_file BE)
├── docker-compose.dev.yml    # override: BE hot-reload, source mount
├── .mcp.json                 # c-hr-docs server
└── pnpm-workspace.yaml       # apps/*, mcp/*
```

## Workflow expectations

1. **Trước khi sửa code app**: đọc CLAUDE.md của app đó (BE hoặc FE), nó sẽ trỏ về `docs/<stack>/`.
2. **Sau khi sửa schema Prisma**: `pnpm --filter @c-hr/backend prisma:generate` + tạo migration.
3. **Trước khi báo done**: chạy `pnpm --filter @c-hr/backend build` (BE) hoặc `pnpm --filter @c-hr/frontend check` (FE).
4. **Khi thêm service mới** (queue worker, mail worker, vv): tạo `services/<name>/` riêng + extend trong root compose.
5. **Không** đẩy logic domain vào root — domain HR sống trong `apps/backend/src/apps/<context>/` và `apps/frontend/src/features/`.
6. **Khi thêm/sửa doc**: hook tự rebuild index. Nếu chạy CI hay agent khác, `pnpm docs:index` thủ công.
