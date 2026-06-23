# C-HR — Human Resource Management

**C-OpenAI Human Resource** là SaaS quản lý nhân sự cho doanh nghiệp: nhân viên, phòng ban, chấm công, nghỉ phép, lương.

---

## Stack

| Layer | Công nghệ |
| --- | --- |
| **Frontend** | Next.js 16 · React 19 · TypeScript 5 · Tailwind 4 · shadcn/ui · TanStack Query · Zustand |
| **Backend** | NestJS 10 · TypeScript · Prisma 5 · JWT (httpOnly cookies) · Swagger |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Storage** | MinIO (S3-compatible) |
| **Infra** | Docker Compose · pnpm workspaces · GitLab CI/CD |

---

## Cấu trúc monorepo

```text
.
├── apps/
│   ├── backend/              # NestJS API  →  :8000
│   └── frontend/             # Next.js app →  :3000
├── services/
│   ├── postgres/             # PostgreSQL 16 container
│   ├── redis/                # Redis 7 container
│   └── minio/                # MinIO container
├── docs/                     # Single source of truth — kiến trúc, ADR, plan
├── mcp/docs-server/          # MCP server expose docs cho AI agent
├── scripts/dev.sh            # Dev CLI (xem bên dưới)
├── docker-compose.yml        # Full stack (prod-like)
├── docker-compose.dev.yml    # Infra only — BE/FE chạy native
└── .gitlab-ci.yml            # CI/CD pipeline
```

---

## Yêu cầu

- [Docker Desktop](https://docs.docker.com/get-docker/) + Docker Compose v2
- Node.js 20+
- pnpm 10+

---

## Quick start (dev)

```bash
# 1. Tạo file env (phải có trước khi start)
cp apps/backend/.env.example  apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# → Sửa JWT_*_SECRET trong apps/backend/.env

# 2. Cài dependencies
pnpm install

# 3. Khởi động infra (postgres + redis + minio)
./scripts/dev.sh start:dev

# 4. Migrate DB và seed dữ liệu mẫu
./scripts/dev.sh migrate
./scripts/dev.sh seed

# 5. Chạy BE + FE (mỗi cái 1 terminal)
./scripts/dev.sh dev backend     # → http://localhost:8000
./scripts/dev.sh dev frontend    # → http://localhost:3000
```

Muốn chạy **full stack trong container** (prod-like, chậm hơn):

```bash
./scripts/dev.sh start
```

---

## Dev CLI

```bash
./scripts/dev.sh help
```

| Lệnh | Tác dụng |
| --- | --- |
| `start:dev` | Chỉ infra (postgres + redis + minio). **Workflow mặc định.** |
| `start [target]` | Full stack trong container (`all` / `backend` / `frontend`) |
| `stop [target]` | Stop containers |
| `dev <target>` | Native dev server (`backend` / `frontend`) |
| `logs [target]` | Tail logs (default: `backend`) |
| `status` | `docker compose ps` |
| `build [target]` | Rebuild image (default: `backend`) |
| `migrate` | `prisma migrate dev` |
| `seed` | `prisma seed` |
| `prisma <args>` | Pass-through Prisma CLI |
| `clean [target]` | Xoá containers + volumes (**DESTRUCTIVE** — drops DB) |

---

## CI/CD

Pipeline GitLab (`.gitlab-ci.yml`) gồm 2 stage:

| Stage | Job | Trigger |
| --- | --- | --- |
| `build` | `build:backend`, `build:frontend` (song song) | Tự động khi push lên `main` |
| `deploy` | `deploy:production` | **Thủ công** — nhấn ▶ trên GitLab sau khi build xong |

### Biến CI/CD cần cấu hình

Vào **GitLab → Settings → CI/CD → Variables**:

| Variable | Mô tả | Masked |
| --- | --- | --- |
| `DEPLOY_SSH_PASSWORD` | Password SSH vào server deploy | ✅ |
| `DEPLOY_HOST` | IP / hostname server | — |
| `DEPLOY_USER` | SSH user (vd: `ubuntu`) | — |
| `DEPLOY_PATH` | Absolute path repo trên server (vd: `/opt/c-hr`) | — |
| `DEPLOY_URL` | URL công khai (vd: `https://hr.example.com`) — optional | — |

> GitLab tự cung cấp: `CI_REGISTRY`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, `CI_REGISTRY_IMAGE`, `CI_COMMIT_SHORT_SHA`.

### Lần đầu deploy lên server mới

```bash
# Trên server — chạy 1 lần duy nhất
git clone <repo-url> /opt/c-hr
cd /opt/c-hr
cp apps/backend/.env.example .env   # điền đầy đủ secrets
docker compose --env-file .env up -d
```

Từ lần sau: push lên `main` → build tự chạy → nhấn ▶ deploy.

---

## Gotchas

- **`apps/backend/.env` phải tồn tại** trước khi chạy `migrate` / `seed`. Prisma CLI đọc trực tiếp file này.
- **`apps/frontend/.env.local` phải tồn tại** trước `start` — `compose env_file:` fail nếu file không có.
- **`NEXT_PUBLIC_*` baked vào bundle lúc build.** Đổi giá trị → phải `./scripts/dev.sh build frontend`.
- **Migration phải chạy lại** sau khi pull branch có schema mới: `./scripts/dev.sh migrate`.
- **Windows file watching** chậm khi mount source vào container — dùng `start:dev` + native pnpm là workflow được khuyến nghị.

---

## Tài liệu

Toàn bộ tài liệu kỹ thuật sống ở [`docs/`](docs/):

| Tài liệu | Nội dung |
| --- | --- |
| [docs/domain.md](docs/domain.md) | HRM entities, invariants, DB conventions |
| [docs/backend/](docs/backend/) | NestJS architecture, conventions, recipes |
| [docs/frontend/](docs/frontend/) | Next.js architecture, conventions, recipes |
| [docs/decisions/](docs/decisions/) | Architecture Decision Records (ADR) |
| [docs/plans/features.md](docs/plans/features.md) | Roadmap tính năng |
| [docs/runbook.md](docs/runbook.md) | Vận hành dev local + on-call |
| [docs/deployment.md](docs/deployment.md) | Hướng dẫn deploy production |

AI agent dùng MCP server `c-hr-docs` ([mcp/docs-server](mcp/docs-server/)) qua tools `docs_list` / `docs_search` / `docs_read`.
