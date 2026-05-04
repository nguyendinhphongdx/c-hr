# C-HR Backend

NestJS 10 API cho **C-HR** (C-OpenAI Human Resource) — SaaS HRM. Thuộc monorepo C-HR ([root README](../../README.md)).

> **Cho AI agents** (Claude Code, Cursor, Aider, …): đọc [CLAUDE.md](CLAUDE.md) trước. Toàn bộ doc kiến trúc + quy ước + recipes ở root [`docs/backend/`](../../docs/backend/README.md). MCP server `c-hr-docs` ([../../mcp/docs-server](../../mcp/docs-server/)) phơi `docs_list` / `docs_search` / `docs_read` qua stdio để discover docs theo nhu cầu.

## Stack

- **Framework**: NestJS 10 (Express)
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL 16 + Prisma 5
- **Cache**: Redis 7
- **Auth**: JWT (access + refresh) qua `passport-jwt`, password hash `bcrypt`. Cookies httpOnly + Bearer fallback.
- **Validation**: `class-validator` + `class-transformer`
- **Docs**: Swagger (`/api/v1/docs` ở non-prod)
- **Mail**: `nodemailer` (MailHog cho local)
- **Storage**: pluggable `local` / `s3` / `gcs`
- **Context**: per-request `AsyncLocalStorage` qua `nestjs-cls`
- **Package manager**: pnpm (workspace ở root)

## Layout

```text
src/
├── main.ts                   # bootstrap (cors, swagger, global pipes/filters)
├── app.module.ts             # composition root
├── config/                   # registerAs() configs (app, auth, db, cache, mail, storage)
├── common/
│   ├── constants/
│   ├── context/              # nestjs-cls + RequestContextService
│   ├── decorators/           # @CurrentUser, @Public
│   ├── exceptions/           # AccessException + typed error codes
│   ├── filters/              # HttpExceptionFilter, AllExceptionsFilter
│   ├── guards/               # JwtAuthGuard, OptionalAuthGuard
│   ├── interceptors/         # LoggingInterceptor, TransformInterceptor (success envelope)
│   ├── pipes/                # ParseUUIDPipe
│   ├── types/                # *.dto.ts (validated input) + *.types.ts
│   └── utils/                # pagination, slug, date, object helpers
├── libs/                     # infrastructure modules (all @Global)
│   ├── database/             # PrismaService
│   ├── logger/               # LoggerService
│   ├── redis/                # RedisService
│   ├── mail/                 # MailService
│   └── storage/              # local / s3 / gcs providers
├── modules/                  # legacy boilerplate modules (đang migrate sang src/apps/<context>/ — ADR 0005)
│   ├── auth/
│   ├── user/
│   └── health/
└── cli/
    ├── cli.ts                # `pnpm cli <command>`
    └── commands/
prisma/
├── schema.prisma             # User model — HRM models sẽ thêm vào đây
└── seed.ts                   # admin seeder
```

HRM modules sẽ thêm theo [docs/plans/features.md](../../docs/plans/features.md) trong layout `src/apps/<bounded-context>/<module>/` (xem [ADR 0005](../../docs/decisions/0005-folder-structure-bounded-contexts.md)).

## Local dev

Khởi động ở **root** (đã có `scripts/dev.sh` orchestrate):

```bash
# Từ root C-HR
./scripts/dev.sh start infra        # postgres + redis
./scripts/dev.sh migrate            # prisma migrate dev
./scripts/dev.sh dev backend        # nest start --watch ở :8000
```

Hoặc thủ công trong thư mục này:

```bash
cp .env.example .env                                # rồi đổi JWT secrets
pnpm install                                        # nên dùng `pnpm install` ở root để cài cả workspace
pnpm prisma:migrate
pnpm prisma:seed
pnpm start:dev
```

API: `http://localhost:8000/api/v1`
Swagger: `http://localhost:8000/api/v1/docs`

## Endpoints sẵn có

| Method | Path                    | Notes                                  |
| ------ | ----------------------- | -------------------------------------- |
| GET    | `/api/v1/health`        | public                                 |
| POST   | `/api/v1/auth/register` | public, set auth cookies               |
| POST   | `/api/v1/auth/login`    | public, set auth cookies               |
| POST   | `/api/v1/auth/refresh`  | đọc refresh token từ body **hoặc** cookie |
| POST   | `/api/v1/auth/logout`   | clear auth cookies                     |
| GET    | `/api/v1/auth/me`       | cookie hoặc `Authorization: Bearer`    |
| GET    | `/api/v1/users/me`      | cookie hoặc `Authorization: Bearer`    |
| PATCH  | `/api/v1/users/me`      | cookie hoặc `Authorization: Bearer`    |
| GET    | `/api/v1/users/:id`     | cookie hoặc `Authorization: Bearer`    |

### Cookie-based auth

`/auth/register`, `/auth/login`, `/auth/refresh` set 2 cookies httpOnly: `access_token` + `refresh_token`. Frontend **không** tự lưu/gửi token — browser carry tự động.

`JwtStrategy` đọc access token từ cookie trước, fallback sang `Authorization: Bearer <token>` cho non-browser clients (mobile, server-to-server).

Config qua env (xem [docs/backend/reference/env-vars.md](../../docs/backend/reference/env-vars.md) cho danh sách đầy đủ):

```text
AUTH_ACCESS_COOKIE_NAME=access_token
AUTH_REFRESH_COOKIE_NAME=refresh_token
COOKIE_DOMAIN=.example.com   # share giữa subdomain
COOKIE_SECURE=true           # auto-on ở production
COOKIE_SAMESITE=lax          # lax | strict | none
```

Cross-site (FE và BE khác domain): `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true`, thêm FE origin vào `CORS_ORIGIN`.

## Common tasks

```bash
pnpm start:dev              # hot-reload
pnpm build && pnpm start:prod
pnpm lint
pnpm format
pnpm test
pnpm prisma:studio          # GUI cho DB
pnpm db:switch mysql        # đổi Prisma datasource
pnpm cli seed               # CLI command đã đăng ký
```

Recipe đầy đủ:

- Add module → [docs/backend/recipes/add-module.md](../../docs/backend/recipes/add-module.md)
- Add CLI → [docs/backend/recipes/add-cli-command.md](../../docs/backend/recipes/add-cli-command.md)
- Auth + cookies → [docs/backend/recipes/auth-and-cookies.md](../../docs/backend/recipes/auth-and-cookies.md)
- Storage S3/GCS → [docs/backend/recipes/storage-providers.md](../../docs/backend/recipes/storage-providers.md)
- Switch DB → [docs/backend/recipes/switch-database.md](../../docs/backend/recipes/switch-database.md)

## Docker

Khuyến nghị chạy qua root compose:

```bash
# Từ root C-HR
./scripts/dev.sh start backend          # build + up backend container (production-like)
./scripts/dev.sh start:dev all          # full stack với BE hot-reload
```

Build standalone (chỉ image BE):

```bash
docker build -t c-hr-backend .
docker run -p 8000:8000 --env-file .env c-hr-backend
```
