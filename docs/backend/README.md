---
title: C-HR backend documentation
description: NestJS-specific architecture, conventions, recipes, reference for the C-HR backend.
tags: [overview, backend, nestjs, c-hr]
---

# C-HR backend documentation

NestJS-specific patterns cho [apps/backend](../../apps/backend/) (layered architecture, DI, Prisma, auth flow, recipes). HRM business domain (entity, invariant) sống ở [../domain.md](../domain.md), không ở đây.

## Contents

| Doc | Read when |
| --- | --- |
| [architecture.md](architecture.md) | You want to understand layers, DI, the request lifecycle |
| [conventions.md](conventions.md) | You're about to write code and need naming/file rules |
| [recipes/add-module.md](recipes/add-module.md) | You're adding a new feature module |
| [recipes/add-cli-command.md](recipes/add-cli-command.md) | You're adding a `pnpm cli <name>` command |
| [recipes/auth-and-cookies.md](recipes/auth-and-cookies.md) | You're touching authentication |
| [recipes/switch-database.md](recipes/switch-database.md) | You want to change DB engine |
| [recipes/storage-providers.md](recipes/storage-providers.md) | You're enabling S3 / GCS |
| [reference/env-vars.md](reference/env-vars.md) | You need to know what an env var does |
| [reference/globals.md](reference/globals.md) | You need to know what's injectable everywhere |

## Related

- [../domain.md](../domain.md) — HRM business model (entity, invariant, glossary)
- [../decisions/](../decisions/) — ADRs (architecture decisions)
- [../plans/features.md](../plans/features.md) — feature queue (Foundation → Auth → HRM → Attendance → Requests)
