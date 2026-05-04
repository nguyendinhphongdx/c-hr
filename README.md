# C-HR

**C-OpenAI Human Resource** — SaaS quản lý nhân sự cho doanh nghiệp.

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind 4, shadcn/ui (Radix Nova), TanStack Query, Zustand |
| Backend | NestJS 10, TypeScript, Prisma 5, JWT (httpOnly cookies), Swagger, class-validator |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Infra | Docker Compose, pnpm workspaces |

## Cấu trúc

```
.
├── apps/
│   ├── backend/              NestJS API (:8000) — entry: apps/backend/CLAUDE.md
│   └── frontend/             Next.js app (:3000) — entry: apps/frontend/CLAUDE.md
├── services/
│   ├── postgres/             standalone postgres compose
│   └── redis/                standalone redis compose
├── docs/                     Single source of truth (kiến trúc, quy ước, ADR, plan)
├── mcp/docs-server/          1 MCP server expose docs cho AI agent
├── scripts/dev.sh            dev CLI
├── docker-compose.yml        root orchestration
├── docker-compose.dev.yml    override hot-reload BE
├── pnpm-workspace.yaml
├── .env.example
├── .mcp.json                 c-hr-docs server
├── .claude/                  permissions + subagents (code-reviewer, scaffolders)
└── CLAUDE.md / AGENTS.md     instructions cho AI coding agents
```

## Yêu cầu

- [Docker Desktop](https://docs.docker.com/get-docker/) + Docker Compose v2
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 10+

## Quick start

```bash
# 1. Copy env (root .env chỉ phục vụ docker-compose, BE/FE đọc env riêng)
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# Sửa các JWT_*_SECRET trong .env và apps/backend/.env

# 2. Install deps
pnpm install

# 3. Start postgres + redis
./scripts/dev.sh start infra

# 4. Migrate DB
./scripts/dev.sh migrate

# 5. Chạy dev (2 terminal)
./scripts/dev.sh dev backend     # http://localhost:8000
./scripts/dev.sh dev frontend    # http://localhost:3000
```

Hoặc chạy full stack qua Docker (BE hot-reload, FE phải native):

```bash
./scripts/dev.sh start:dev all
./scripts/dev.sh dev frontend
```

## CLI

```bash
./scripts/dev.sh help
```

| Command | Tác dụng |
|---|---|
| `start [target]` | docker compose up (target: `all` / `infra` / `postgres` / `redis` / `backend`) |
| `start:dev [target]` | up với override hot-reload |
| `stop [target]` | stop containers |
| `dev <target>` | native dev server (`backend` / `frontend`) |
| `logs [target]` | tail logs (default: `backend`) |
| `status` | docker compose ps |
| `migrate` | prisma migrate dev |
| `seed` | prisma seed |
| `prisma <args>` | pass-through prisma CLI |
| `clean [target]` | xoá containers + volumes (DESTRUCTIVE) |

## Tài liệu

Toàn bộ doc của monorepo sống ở [docs/](docs/) (single source of truth):

- Quy ước AI agent: [CLAUDE.md](CLAUDE.md) (root) + [apps/backend/CLAUDE.md](apps/backend/CLAUDE.md) + [apps/frontend/CLAUDE.md](apps/frontend/CLAUDE.md)
- HRM domain: [docs/domain.md](docs/domain.md) (BE) + [docs/frontend/domain.md](docs/frontend/domain.md) (UX)
- Kiến trúc + recipes: [docs/backend/](docs/backend/) (NestJS) + [docs/frontend/](docs/frontend/) (Next.js)
- ADR: [docs/decisions/](docs/decisions/)
- Plan đang chạy: [docs/plans/refactor.md](docs/plans/refactor.md) + [docs/plans/features.md](docs/plans/features.md)
- Vận hành: [docs/runbook.md](docs/runbook.md), deploy: [docs/deployment.md](docs/deployment.md)

AI agent dùng MCP server `c-hr-docs` ([mcp/docs-server](mcp/docs-server/)) qua tools `docs_list / docs_search / docs_read`.

## Status

Đang ở giai đoạn refactor setup (xem [docs/plans/refactor.md](docs/plans/refactor.md)). Tính năng HR (employees, departments, attendance, leave, payroll) sẽ được plan sau khi xong cả 3 phase refactor.
