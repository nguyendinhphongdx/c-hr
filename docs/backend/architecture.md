---
title: Architecture
description: Layered structure, dependency injection, and HTTP request lifecycle.
tags: [architecture, layers, di, request-lifecycle]
---

# Architecture

## Layers

The codebase has four layers, each depending only on layers above it:

```
┌─────────────────────────────────────────────┐
│ modules/         feature code (auth, user)  │  ← can depend on anything below
├─────────────────────────────────────────────┤
│ common/          cross-cutting helpers      │  ← can depend on libs/ and config/
├─────────────────────────────────────────────┤
│ libs/            infrastructure (@Global)   │  ← can depend on config/
├─────────────────────────────────────────────┤
│ config/          @nestjs/config namespaces  │  ← leaf
└─────────────────────────────────────────────┘
```

**Rule of thumb**: if `modules/foo` imports from `modules/bar`, that's a smell — extract the shared piece into `common/` or `libs/`, or have one module export a service the other imports via DI.

## Path aliases

`tsconfig.json` defines four aliases that map to these layers:

```ts
"@/*":        "src/*"
"@common/*":  "src/common/*"
"@config/*":  "src/config/*"
"@libs/*":    "src/libs/*"
"@modules/*": "src/modules/*"
```

Use them. Don't write `../../../common/...`.

## Dependency injection model

NestJS modules form a graph. Three categories of modules in this codebase:

### Global infrastructure (`libs/*`)

All modules in `libs/` are decorated with `@Global()` — once imported in `AppModule`, their providers are available everywhere without re-importing. This is intentional: things like `PrismaService` and `RedisService` are needed in every feature.

Global providers as of today: `PrismaService`, `RedisService`, `LoggerService`, `MailService`, `STORAGE_PROVIDER` (token), `RequestContextService`.

See [reference/globals.md](reference/globals.md) for the full list.

### Feature modules (`modules/*`)

Each feature has its own module declaring controllers and providers. Other features import the module if they need its services. **Never import another feature's controller** — only the module (or the service via the module's `exports`).

### Composition root (`AppModule`)

The single place where every module is wired. New feature modules **must** be registered here. See [src/app.module.ts](../../apps/backend/src/app.module.ts).

## Request lifecycle

A typical HTTP request flows through:

```
   ┌──── client ────┐
   │                ▼
   │     Express middleware (cookieParser, CORS)
   │                ▼
   │     ClsModule middleware     (sets ip, userAgent in AsyncLocalStorage)
   │                ▼
   │     ThrottlerGuard           (rate limit)
   │                ▼
   │     ┌─ Route-level guards ─┐
   │     │ JwtAuthGuard         │ extracts token from cookie → header
   │     │ OptionalAuthGuard    │ same but doesn't throw on missing token
   │     └──────────────────────┘
   │                ▼
   │     Global ValidationPipe   (class-validator on @Body / @Query / @Param)
   │                ▼
   │     Controller method       (delegates to service — no business logic here)
   │                ▼
   │     Service / repository    (domain logic, DB calls)
   │                ▼
   │     Response handler:
   │       LoggingInterceptor    (logs method/url/status/duration)
   │       TransformInterceptor  (wraps payload in { success, data })
   │                ▼
   │     Global filters (only on errors):
   │       HttpExceptionFilter   (typed errors)
   │       AllExceptionsFilter   (catch-all 500s)
   │                ▼
   └──── client ◄───┘
```

## Per-request context

`nestjs-cls` (Continuation Local Storage) provides per-request state via `AsyncLocalStorage`. Set values in guards/interceptors; read anywhere downstream.

```ts
// In a guard / interceptor
contextService.set({ userId: user.id });

// Anywhere later in the request
contextService.userId  // → 'usr_123'
```

`JwtAuthGuard` already populates `userId` and `sessionId`. Add new context keys by extending `RequestContextData` in [src/common/context/request-context.service.ts](../../apps/backend/src/common/context/request-context.service.ts).

## Response shape

Every successful response is wrapped by `TransformInterceptor`:

```json
{ "success": true, "data": <controller return value> }
```

Pagination responses are not re-wrapped — return them already shaped:

```json
{
  "success": true,
  "data": [/* items */],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3, "hasNext": true, "hasPrev": false }
}
```

Use `paginate(data, total, page, limit)` from `@/common/utils` to build it.

## Error shape

Errors are wrapped by `HttpExceptionFilter` (HTTP) or `AllExceptionsFilter` (everything else):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email: must be a valid email",
    "details": { "fields": [/* per-field details */] }
  },
  "timestamp": "...",
  "path": "/api/v1/auth/login"
}
```

For typed authorization failures, use `AccessException` from `@/common/exceptions` — the frontend can switch on `code` to redirect appropriately.
