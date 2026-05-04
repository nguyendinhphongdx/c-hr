---
title: Environment variables
description: Full reference of every env var the app reads, with defaults and notes.
tags: [reference, env, config]
---

# Environment variables

All env vars are loaded by `@nestjs/config` from `.env.local` then `.env` (in that order). Inside services, **always** read via `ConfigService`, not `process.env` directly. See [conventions.md](../conventions.md#configuration).

The canonical template is [.env.example](../../../apps/backend/.env.example). This doc explains *why* each value matters.

## App

| Var | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | Disables Swagger when `production`. |
| `PORT` | `3000` | HTTP port. |
| `API_PREFIX` | `api/v1` | Mounted as global prefix. Affects routes and Swagger path. |
| `API_BASE_URL` | `http://localhost:3000` | Used to build absolute URLs (e.g. local file URLs). |
| `LOG_LEVEL` | `info` | `error` \| `warn` \| `info` \| `debug` \| `verbose`. Read by `LoggerService`. |
| `APP_NAME` | `NestJS API` | Title shown in Swagger. |

## CORS & cookies

| Var | Default | Notes |
| --- | --- | --- |
| `CORS_ORIGIN` | `*` (no creds) | Comma-separated. Required to be explicit when `credentials: true`. |
| `COOKIE_DOMAIN` | unset | Set to `.example.com` to share across subdomains. |
| `AUTH_ACCESS_COOKIE_NAME` | `access_token` | |
| `AUTH_REFRESH_COOKIE_NAME` | `refresh_token` | |
| `COOKIE_SECURE` | `true` in prod, else `false` | Override with literal `'true'` / `'false'`. Required `true` when `SAMESITE=none`. |
| `COOKIE_SAMESITE` | `lax` | `lax` \| `strict` \| `none`. |

## Database

| Var | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | postgres example | Connection string. Format depends on Prisma provider — see [recipes/switch-database.md](../recipes/switch-database.md). |
| `DATABASE_POOL_MIN` | `2` | Currently informational — Prisma has its own pool. |
| `DATABASE_POOL_MAX` | `10` | Currently informational. |

## Redis

| Var | Default | Notes |
| --- | --- | --- |
| `REDIS_HOST` | `localhost` | |
| `REDIS_PORT` | `6379` | |
| `REDIS_PASSWORD` | unset | Optional. Empty = no auth. |

## JWT

| Var | Default | Notes |
| --- | --- | --- |
| `JWT_ACCESS_SECRET` | `change-me-access-secret` | **MUST override in prod.** |
| `JWT_REFRESH_SECRET` | `change-me-refresh-secret` | **MUST override in prod.** |
| `JWT_ACCESS_EXPIRATION` | `15m` | Affects both JWT exp and access cookie maxAge. |
| `JWT_REFRESH_EXPIRATION` | `7d` | Affects both JWT exp and refresh cookie maxAge. |

## Mail (SMTP)

| Var | Default | Notes |
| --- | --- | --- |
| `MAIL_HOST` | `localhost` | Use `localhost:1025` for the bundled MailHog. |
| `MAIL_PORT` | `1025` | |
| `MAIL_USER` | unset | Skip auth if both user and password are empty. |
| `MAIL_PASSWORD` | unset | |
| `MAIL_FROM` | `noreply@example.com` | Default `From:` for outgoing mail. |
| `MAIL_SECURE` | `false` | `true` for SMTPS (port 465). STARTTLS is auto-detected. |

## Storage

| Var | Default | Notes |
| --- | --- | --- |
| `STORAGE_TYPE` | `local` | `local` \| `s3` \| `gcs`. Picks provider in `StorageModule`. |
| `STORAGE_LOCAL_PATH` | `./uploads` | Path under repo root. Auto-created on startup. |
| `AWS_S3_BUCKET` | unset | Required when `STORAGE_TYPE=s3`. |
| `AWS_S3_REGION` | `us-east-1` | |
| `AWS_ACCESS_KEY_ID` | unset | If unset, falls back to default AWS credential chain (IAM role, etc.). |
| `AWS_SECRET_ACCESS_KEY` | unset | |
| `GCS_PROJECT_ID` | unset | Required when `STORAGE_TYPE=gcs`. |
| `GCS_BUCKET` | unset | |
| `GCS_KEY_FILE` | unset | Path to service-account JSON. Mutually exclusive with `GCS_CREDENTIALS`. |
| `GCS_CREDENTIALS` | unset | Inline JSON (escape-quoted). Useful for environments without a filesystem. |

## Admin / seeding

| Var | Default | Notes |
| --- | --- | --- |
| `ADMIN_EMAIL` | `admin@example.com` | Used by `pnpm prisma:seed` and `pnpm cli seed`. |
| `ADMIN_PASSWORD` | `Admin@123456` | **Change in any non-trivial deployment.** |
