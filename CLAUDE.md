---
title: C-HR — Project conventions for AI agents (root)
description: Navigation hub. Trỏ xuống CLAUDE.md của apps/backend và apps/frontend. Đọc trước khi sửa code.
tags: [overview, conventions, claude, monorepo, c-hr]
---

# C-HR — Conventions for AI agents (root)

C-HR (**C-OpenAI Human Resource**) là SaaS quản lý nhân sự cho doanh nghiệp. Đây là **root navigation hub** cho monorepo. Khi làm việc trong một app cụ thể, đọc CLAUDE.md của app đó — file này chỉ chứa quy tắc cross-cutting.

## Project at a glance

- **Domain**: HRM (employees, departments, attendance, leave, payroll)
- **Stack**: Next.js 16 (frontend) + NestJS 10 (backend) + Postgres 16 + Redis 7
- **Layout**:
  - [apps/backend](apps/backend/) — NestJS + Prisma + Postgres + Redis. Boilerplate gốc + identity C-HR.
  - [apps/frontend](apps/frontend/) — Next.js 16 + Tailwind 4 + shadcn/ui (Radix Nova) + TanStack Query.
  - [services/postgres](services/postgres/) — Postgres 16 dev container (standalone hoặc qua root compose).
  - [services/redis](services/redis/) — Redis 7 dev container.
  - [scripts/dev.sh](scripts/dev.sh) — CLI quản lý docker compose + dev workflows.
- **Port mặc định**: BE `:8000`, FE `:3000`, Postgres `:5432`, Redis `:6379`.

## Khi user yêu cầu, đọc đúng CLAUDE.md

| Phạm vi yêu cầu | File phải đọc trước |
|---|---|
| Bất cứ thay đổi nào trong [apps/backend/](apps/backend/) | [apps/backend/CLAUDE.md](apps/backend/CLAUDE.md) |
| Bất cứ thay đổi nào trong [apps/frontend/](apps/frontend/) | [apps/frontend/CLAUDE.md](apps/frontend/CLAUDE.md) |
| Docker / orchestration / services | File này + [REFACTOR_PLAN.md](REFACTOR_PLAN.md) |
| Schema Prisma / migration | [apps/backend/CLAUDE.md](apps/backend/CLAUDE.md) (mục Hard rules #2) |
| HRM domain (employees, payroll, …) | [apps/backend/docs/project/domain.md](apps/backend/docs/project/domain.md) + [apps/frontend/docs/project/domain.md](apps/frontend/docs/project/domain.md) |

**Tuyệt đối không** override quy ước của app con từ root. Nếu cần thay quy ước → sửa CLAUDE.md của app đó, không thêm exception ở đây.

## Cross-cutting hard rules (root)

1. **`.env` không commit.** Mỗi tầng có file riêng: `.env` ở root (cho docker-compose), `apps/backend/.env`, `apps/frontend/.env.local`. Template tương ứng `.env.example` ở từng nơi.
2. **Dockerfile / docker-compose** chỉ sửa khi orchestration thay đổi. Khi thêm service mới, theo pattern: `services/<name>/docker-compose.yml` + extends trong root compose.
3. **`scripts/dev.sh`** là entry point thống nhất cho dev. Đừng viết script riêng tản mác — bổ sung command vào file này.
4. **MCP servers** — root [.mcp.json](.mcp.json) đăng ký 2 MCP server (`backend-docs`, `frontend-docs`) trỏ xuống mỗi app. Đừng nhân bản, dùng các tool `docs_list / docs_search / docs_read` của từng server theo phạm vi.

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
pnpm --filter @c-hr/frontend typecheck
```

## Đường nét thư mục

```
.
├── apps/
│   ├── backend/              # NestJS — đọc apps/backend/CLAUDE.md
│   └── frontend/             # Next.js — đọc apps/frontend/CLAUDE.md
├── services/
│   ├── postgres/             # standalone postgres compose
│   └── redis/                # standalone redis compose
├── scripts/
│   └── dev.sh                # dev CLI
├── docker-compose.yml        # root: postgres + redis + backend
├── docker-compose.dev.yml    # override: BE hot-reload, source mount
├── .mcp.json                 # backend-docs + frontend-docs MCP servers
├── pnpm-workspace.yaml       # apps/*, packages/*
├── .env.example              # template root env (cho docker-compose)
├── REFACTOR_PLAN.md          # plan setup hiện tại
└── CLAUDE.md                 # file này
```

## Workflow expectations

1. **Trước khi sửa code app**: đọc CLAUDE.md của app đó (BE hoặc FE).
2. **Sau khi sửa schema Prisma**: `pnpm --filter @c-hr/backend prisma:generate` + tạo migration.
3. **Trước khi báo done**: chạy `pnpm --filter @c-hr/backend build` (BE) hoặc `pnpm --filter @c-hr/frontend check` (FE).
4. **Khi thêm service mới** (queue worker, worker mail, vv): tạo `services/<name>/` riêng + extend trong root compose.
5. **Không** đẩy logic domain vào root — domain HR sống trong `apps/backend/src/modules/` và `apps/frontend/src/features/`.
