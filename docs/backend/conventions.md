---
title: Conventions
description: Naming, file organization, and concrete do/don't rules.
tags: [conventions, style, naming]
---

# Conventions

## Naming

| Kind | Convention | Example |
| --- | --- | --- |
| File | kebab-case + role suffix | `user.service.ts`, `login.dto.ts`, `parse-uuid.pipe.ts` |
| Class | PascalCase + role suffix | `UserService`, `LoginDto`, `ParseUUIDPipe` |
| Interface | PascalCase, prefix `I` only for JWT-style payloads | `RequestUser`, `IJwtPayload` |
| Constant | SCREAMING_SNAKE | `MAX_PAGE_SIZE` |
| Enum | PascalCase, members SCREAMING_SNAKE | `UserRole.ADMIN` |
| Method | camelCase, verb-first | `findById`, `issueTokens` |
| Boolean | `is*` / `has*` / `should*` | `isPrivate`, `hasRequiredRole` |
| Folder | kebab-case | `request-context/` |

## File organization inside a module

```
src/modules/<feature>/
├── <feature>.module.ts        # @Module — glue
├── <feature>.controller.ts    # HTTP routes (or split per role: admin-<feature>.controller.ts)
├── <feature>.service.ts       # business logic
├── dto/
│   ├── create-<feature>.dto.ts
│   ├── update-<feature>.dto.ts
│   ├── <feature>-query.dto.ts # pagination/filter
│   └── index.ts               # re-exports
└── strategies/                # optional — passport strategies
```

Split into subfolders (`controllers/`, `services/`, `domain/`) only when the module has 3+ files of the same role. Don't pre-split.

## DTO vs interface — when to use what

Both live under `common/types/` (cross-module) or `<module>/dto/` (per-feature). The **filename suffix** tells them apart:

| Suffix | Kind | Use when |
| --- | --- | --- |
| `*.dto.ts` | **Class** + `class-validator` decorators | HTTP input (`@Body`, `@Query`, `@Param`); appears in Swagger |
| `*.types.ts` | **Type-only** declarations (interface / type alias) | Internal shapes — JWT payloads, service-to-service contracts, response interfaces |

Examples:

- Cross-module shared → [`src/common/types/pagination.dto.ts`](../../apps/backend/src/common/types/pagination.dto.ts) + [`src/common/types/pagination.types.ts`](../../apps/backend/src/common/types/pagination.types.ts)
- Per-feature DTOs → `src/modules/<feature>/dto/*.dto.ts`
- Per-feature internal types → `src/modules/<feature>/<feature>.types.ts` next to the consumer

**Don't add validation decorators to type-only declarations.** The framework can't run them — that's why we split by filename suffix even though they share a folder.

## Service vs controller

- **Controller**: receives request, validates input (via DTO + global pipe), delegates to service, returns. Maximum ~10 lines per route handler.
- **Service**: holds business logic. Returns plain objects or domain entities. Throws `HttpException` subclasses (`NotFoundException`, `ConflictException`, etc.) or `AccessException` for typed errors.

Don't inject `Request` / `Response` into services. If you need request context (userId, ip), inject `RequestContextService`.

## Configuration

All env-driven config goes through `@nestjs/config` namespaces in `src/config/*.config.ts` using `registerAs`. **Never read `process.env.X` directly inside a service** — inject `ConfigService` and read `configService.get('namespace.key')`.

To add a new namespace:

1. Create `src/config/<name>.config.ts` exporting `registerAs('<name>', () => ({ ... }))`.
2. Add the export to [src/config/index.ts](../../apps/backend/src/config/index.ts) and to the `configs` array.
3. Document the env vars in [reference/env-vars.md](reference/env-vars.md) and `.env.example`.

## Logging

- Use `Logger` from `@nestjs/common` for short-lived contexts inside a class:
  ```ts
  private readonly logger = new Logger(MyService.name);
  this.logger.log(...);
  ```
- Use the global `LoggerService` (`@libs/logger`) when you need formatted/leveled output across non-Nest contexts (CLI, scripts).
- Never `console.log` in committed code.

## Error handling

| Situation | Throw |
| --- | --- |
| Resource not found | `NotFoundException` |
| Bad input not caught by DTO | `BadRequestException` |
| Authentication missing/invalid | `UnauthorizedException` |
| User authenticated but lacks permission | `AccessException` (typed code) |
| Conflict (duplicate, etc.) | `ConflictException` |
| Truly unexpected | let it bubble — `AllExceptionsFilter` will 500 it |

`AccessException` codes are in [src/common/exceptions/access.exception.ts](../../apps/backend/src/common/exceptions/access.exception.ts). Add new codes there, not in random services.

## DB access

- Always go through `PrismaService`. Don't `new PrismaClient()` anywhere else.
- Multi-step writes that must be atomic → wrap in `prisma.$transaction([...])` or `prisma.$transaction(async (tx) => {...})`.
- Don't `select: undefined` (defaults to all columns including sensitive ones like `password`); use `select` or `omit` deliberately or strip sensitive fields after the fact (see `omit()` in `@/common/utils`).

## Imports

- Prefer named exports. Default exports are reserved for `registerAs` config files.
- Always import from path aliases (`@common/*`, `@libs/*`, etc.), never relative paths that escape the current module.
- Re-export from `index.ts` per folder (`common/dto/index.ts`, `common/utils/index.ts`, etc.) so callers import once.

## Comments

- Default to **no comments**. Code should explain *what*; comments explain *why* — only when the why is non-obvious.
- No trailing-summary comments (`// updates user — added for X flow`). That belongs in the PR description.
- TSDoc block comments are fine on **public functions exported from `common/` or `libs/`**. Skip them on private internals.

## Testing

- Unit tests live next to the file: `user.service.spec.ts` next to `user.service.ts`.
- E2E tests live in `test/`.
- Mock external services (Redis, mail, storage) at the module boundary.
- Don't mock `PrismaService` if the test is cheap to run against a real DB — prefer integration tests with a test DB.

## What NOT to do

- ❌ `console.log` in committed code.
- ❌ `process.env.X` inside services / controllers.
- ❌ Throwing `new Error(...)` from HTTP handlers.
- ❌ `as any` to silence type errors (a few are tagged in code where library typings are wrong; do not add new ones).
- ❌ Editing files in `prisma/migrations/` by hand.
- ❌ Importing one feature module's internals from another.
- ❌ Adding business logic to controllers.
- ❌ Skipping the global response envelope by returning a `Response` object directly. Use `@Res({ passthrough: true })` only when you need to set cookies or headers, and still return the value.
