# C-HR Backend

NestJS 10 API cho **C-HR** (C-OpenAI Human Resource) — SaaS HRM. Thuộc monorepo C-HR ([root README](../../README.md)).

> **Cho AI agents** (Claude Code, Cursor, Aider, …): đọc [CLAUDE.md](CLAUDE.md) trước. App ship kèm MCP server tại [mcp/docs-server](mcp/docs-server) phơi bày `docs_list` / `docs_search` / `docs_read` qua stdio để discover docs theo nhu cầu thay vì load cả tree. Đăng ký trong [.mcp.json](.mcp.json).

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

```
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
├── modules/                  # feature modules (HRM domain ở đây)
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

HRM modules sẽ thêm sau (xem [REFACTOR_PLAN.md](../../REFACTOR_PLAN.md) → "Sau phase 3"): `employee`, `department`, `position`, `attendance`, `leave`, `payroll`.

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
cp .env.example .env                 # rồi đổi JWT secrets
pnpm install                         # nên dùng `pnpm install` ở root để cài cả workspace
pnpm prisma:migrate
pnpm prisma:seed
pnpm start:dev
```

API: `http://localhost:8000/api/v1`
Swagger: `http://localhost:8000/api/v1/docs`
MailHog UI (nếu start): `http://localhost:8025`

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

Config qua env:

```
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

### Adding a new module

```
src/modules/<feature>/
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.module.ts
└── dto/
```

Đăng ký module trong [src/app.module.ts](src/app.module.ts). Recipe đầy đủ: [docs/boilerplate/recipes/add-module.md](docs/boilerplate/recipes/add-module.md).

### Adding a CLI command

1. Tạo `src/cli/commands/<name>.command.ts` implement `CliCommand`.
2. Register class trong [src/cli/cli.module.ts](src/cli/cli.module.ts) `providers` + thêm vào map [src/cli/commands/index.ts](src/cli/commands/index.ts).
3. `pnpm cli <name>`.

### Storage S3 / GCS

```bash
# S3
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
# .env: STORAGE_TYPE=s3 + AWS_* vars

# GCS
pnpm add @google-cloud/storage
# .env: STORAGE_TYPE=gcs + GCS_* vars
```

`StorageModule` factory pick provider theo `STORAGE_TYPE`.

## Docs & AI agents

```text
CLAUDE.md                          # entry point cho AI agents
AGENTS.md                          # pointer ngắn → CLAUDE.md
docs/
├── README.md                      # human index
├── boilerplate/                   # framework patterns (đừng sửa trừ khi đổi kiến trúc)
│   ├── architecture.md
│   ├── conventions.md
│   ├── recipes/
│   └── reference/
├── project/                       # docs C-HR thật (domain HRM)
│   ├── domain.md
│   ├── runbook.md
│   ├── deployment.md
│   └── decisions/
└── index.json                     # auto-generated — fuel cho MCP server
mcp/docs-server/                   # local MCP server (stdio)
.mcp.json
```

```bash
pnpm docs:index    # regenerate docs/index.json sau khi sửa markdown (PostToolUse hook đã tự chạy)
pnpm mcp:start     # smoke-test MCP server (Claude Code tự start qua .mcp.json)
```

### Claude Code integration

```text
.claude/
├── settings.json         # permissions allowlist + PostToolUse hooks
├── settings.local.json   # per-user overrides (gitignored)
└── agents/
    ├── code-reviewer.md
    └── module-scaffolder.md
```

- **Permissions** auto-approve các lệnh an toàn (`pnpm build`, `pnpm test`, `git diff`, `node scripts/*`), cấm các lệnh phá hoại (`git push`, `git reset --hard`, `rm -rf $HOME`).
- **PostToolUse hook** ([scripts/hooks/post-edit-docs.js](scripts/hooks/post-edit-docs.js)) auto-rebuild `docs/index.json` khi sửa `CLAUDE.md`, `AGENTS.md`, hoặc `docs/**/*.md`.
- **Subagents**: `code-reviewer` cho review, `module-scaffolder` cho thêm feature module.

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
