---
title: Global services
description: Providers available everywhere via DI without module re-import.
tags: [reference, di, globals]
---

# Global services

Anything in `libs/` is `@Global()` — once `AppModule` imports it, the providers are injectable from any feature module without re-importing.

| Token | Source | Use for |
| --- | --- | --- |
| `PrismaService` | [@libs/database](../../../apps/backend/src/libs/database) | All DB access. Extends `PrismaClient`. |
| `RedisService` | [@libs/redis](../../../apps/backend/src/libs/redis) | Cache, pub/sub, ephemeral state. |
| `LoggerService` | [@libs/logger](../../../apps/backend/src/libs/logger) | Leveled, color-coded logging. |
| `MailService` | [@libs/mail](../../../apps/backend/src/libs/mail) | Send emails via configured SMTP. |
| `STORAGE_PROVIDER` (token) | [@libs/storage](../../../apps/backend/src/libs/storage) | Inject as `StorageProvider` interface. |
| `RequestContextService` | [@common/context](../../../apps/backend/src/common/context) | Per-request state (userId, ip) via `nestjs-cls`. |
| `ConfigService` | `@nestjs/config` | Read namespaced config (`app.port`, `auth.jwtAccessSecret`, etc.). |
| `EventEmitter2` | `@nestjs/event-emitter` | In-process pub/sub for decoupled event handlers. |
| `JwtService` | `@nestjs/jwt` | Sign / verify JWTs. (Currently only used in `AuthModule` — feel free to use elsewhere.) |

## Examples

```ts
@Injectable()
export class MyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly context: RequestContextService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async work() {
    const userId = this.context.requireUserId;        // throws if not in request scope
    const cached = await this.redis.getJson<User>(`user:${userId}`);
    // ...
  }
}
```

## Adding a new global service

1. Create the module in `src/libs/<name>/<name>.module.ts` with `@Global()`.
2. Provide and export the service.
3. Import the module in [src/app.module.ts](../../../apps/backend/src/app.module.ts) under "Infrastructure modules".
4. Document the new token here.

## Things deliberately NOT global

| Thing | Why not |
| --- | --- |
| `AuthService` | Feature service. Inject explicitly via `AuthModule`. |
| `UserService` | Same. |
| `JwtAuthGuard` | Used per-route via `@UseGuards()`. Not needed everywhere. |
| Schedulers | Add `@nestjs/schedule` only if you actually use it. |

## Using globals from outside the request scope

`RequestContextService` only has values during an active HTTP/RPC request (set by `ClsModule` middleware). Calling `requireUserId` from a background job will throw — guard with `RequestContextService.isActive()` if your code might run from both.

`PrismaService`, `RedisService`, etc. work fine from anywhere — including the CLI runner ([src/cli/cli.ts](../../../apps/backend/src/cli/cli.ts)) and seed scripts.
