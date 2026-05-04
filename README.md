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
├── docker-compose.yml        full stack: postgres + redis + backend + frontend
├── docker-compose.dev.yml    infra only (postgres + redis) — BE/FE chạy native
├── pnpm-workspace.yaml
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
# 1. Copy env per app (cả 2 file gitignored — phải tạo trước khi start).
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# Sửa các JWT_*_SECRET trong apps/backend/.env trước khi start.

# 2. Install deps (1 lockfile duy nhất ở root)
pnpm install

# 3. Start infra (postgres + redis container)
./scripts/dev.sh start:dev

# 4. Migrate DB + seed demo data
./scripts/dev.sh migrate
./scripts/dev.sh seed

# 5. Chạy BE + FE native (mỗi app 1 terminal)
./scripts/dev.sh dev backend     # http://localhost:8000
./scripts/dev.sh dev frontend    # http://localhost:3000
```

Hoặc chạy **full stack trong container** để verify prod-like (chậm hơn, ít hot-reload):

```bash
./scripts/dev.sh start            # postgres + redis + backend + frontend
```

## CLI

```bash
./scripts/dev.sh help
```

| Command | Tác dụng |
|---|---|
| `start:dev` | Chỉ infra (postgres + redis) trong container. BE/FE chạy native. **Default workflow.** |
| `start [target]` | Full stack trong container (default `all` = postgres + redis + backend + frontend). Build image nếu thiếu. |
| `stop [target]` | Stop containers |
| `dev <target>` | Native dev server (`backend` / `frontend`) |
| `logs [target]` | Tail logs (default: `backend`) |
| `status` | docker compose ps |
| `build [target]` | Rebuild image (default: `backend`) |
| `migrate` | prisma migrate dev |
| `seed` | prisma seed |
| `prisma <args>` | Pass-through prisma CLI |
| `clean [target]` | Xoá containers + volumes (DESTRUCTIVE — drops DB) |

## Gotchas / known issues

- **`apps/backend/.env` phải tồn tại + có `DATABASE_URL`** trước khi `migrate` / `seed` / `start`. Prisma CLI đọc trực tiếp file này (không cascade qua root). Copy từ `.env.example` nếu chưa có.
- **`apps/frontend/.env.local` phải tồn tại** trước `./scripts/dev.sh start` — compose `env_file:` directive yêu cầu file thật, sẽ fail nếu thiếu. Copy từ `.env.example`.
- **`NEXT_PUBLIC_*` vars baked vào FE bundle lúc build.** Khi container `frontend` build, `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` được nhúng vào JS bundle. Đổi giá trị → phải `./scripts/dev.sh build frontend`.
- **BE Dockerfile dùng `pnpm install` (không `--frozen-lockfile`)** vì workspace lock chỉ có ở root, không được copy vào build context per-app. Image dev OK nhưng không byte-reproducible. TODO: chuyển build context lên root khi cần CI determinism.
- **Container WSL/Windows file watching** chậm khi mount source code. Khuyến nghị: dùng `start:dev` + native pnpm (mặc định) thay vì cố mount source vào container.
- **Migration phải chạy lại** sau khi pull về branch có Prisma schema mới: `./scripts/dev.sh migrate`. Kiểm tra `apps/backend/prisma/migrations/` có folder mới chưa apply không.
- **Audit log async write** — `@Auditable` ghi qua EventEmitter. Nếu Postgres down giữa request, audit entry mất nhưng request vẫn return 200. Để chặt chẽ hơn (transactional outbox) sẽ revisit khi traffic lớn.

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
