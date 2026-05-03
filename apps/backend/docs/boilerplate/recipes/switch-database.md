---
title: Switch database engine
description: Move between Postgres / MySQL / SQLite / SQL Server / MongoDB.
tags: [recipe, database, prisma]
---

# Switch database engine

Prisma's `datasource.provider` cannot be templated via `env()` — it must be a literal. The boilerplate works around this with a small script:

```bash
pnpm db:switch postgresql   # default
pnpm db:switch mysql
pnpm db:switch sqlite
pnpm db:switch sqlserver
pnpm db:switch mongodb
```

The script ([scripts/switch-db.js](../../../scripts/switch-db.js)) rewrites the `provider` line in `prisma/schema.prisma`. Migrations are engine-specific, so:

```bash
pnpm db:switch mysql

# 1. Update DATABASE_URL in .env to a MySQL URL, e.g.
#    DATABASE_URL=mysql://root:root@localhost:3306/app_db

# 2. Wipe existing migrations (they were for the previous engine)
rm -rf prisma/migrations

# 3. Regenerate from scratch
pnpm prisma:migrate -- --name init
```

## DATABASE_URL formats

| Engine | Example |
| --- | --- |
| postgresql | `postgresql://postgres:postgres@localhost:5432/app_db` |
| mysql | `mysql://root:root@localhost:3306/app_db` |
| sqlite | `file:./dev.db` |
| sqlserver | `sqlserver://localhost:1433;database=app_db;user=sa;password=...;trustServerCertificate=true` |
| mongodb | `mongodb://localhost:27017/app_db` |

## Schema portability gotchas

The default schema in `prisma/schema.prisma` is intentionally portable — no `@db.Uuid`, no `@db.JsonB`, no Postgres extensions. If you add such fields **after** switching engines, watch out:

| Type | Postgres | MySQL | SQLite | MongoDB |
| --- | --- | --- | --- | --- |
| Native UUID | `@db.Uuid` | `@db.Char(36)` | (none — String) | (ObjectId) |
| Enum | native enum | native enum | mapped to string | mapped to string |
| `Json` | `Jsonb` | `Json` | (none — TEXT) | native |
| `String[]` | native array | ⛔ unsupported | ⛔ unsupported | native |
| `BigInt` | native | native | ⛔ may overflow | (use Decimal128) |

For maximum portability across all engines, stick to: `String`, `Int`, `Float`, `Decimal`, `Boolean`, `DateTime`, `Json` (single, no arrays), and enums.

## MongoDB-specific notes

If you switch to MongoDB:

1. Change `id` type to `String @id @default(auto()) @map("_id") @db.ObjectId` for new models.
2. Drop the `@@index` syntax — MongoDB indexes are managed via Prisma's `@@index` but with different semantics; verify against the [Prisma MongoDB docs](https://www.prisma.io/docs/orm/overview/databases/mongodb).
3. Run `pnpm prisma db push` instead of `migrate dev` (Mongo doesn't use migrations).

## Verifying the switch

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed         # creates the admin user
pnpm start:dev
curl http://localhost:3000/api/v1/health  # smoke test
```

If `prisma:generate` fails, the schema isn't compatible with the new provider — inspect the error and revert with `pnpm db:switch postgresql` while you investigate.
