---
title: C-HR documentation index
description: Single source of truth cho monorepo. Domain, ADR, plan, conventions cho cả BE và FE đều ở đây.
tags: [overview, index, c-hr]
---

# C-HR documentation

Single source of truth cho cả monorepo. Không nhân bản theo app — `apps/<name>/CLAUDE.md` chỉ là entry point trỏ về đây.

## Cross-cutting

| Doc | Khi nào đọc |
| --- | --- |
| [domain.md](domain.md) | HRM business domain — entity, relationship, invariant. Nguồn gốc cho Prisma schema và service logic. |
| [runbook.md](runbook.md) | Vận hành dev local, on-call procedure, alerts (BE + FE). |
| [deployment.md](deployment.md) | Environment, secret, CI/CD, rollout/rollback (BE + FE). |
| [decisions/](decisions/) | ADRs — quyết định kiến trúc đã chốt. Mọi thay đổi lớn phải có ADR. |
| [plans/](plans/) | Active work plan — refactor.md (đang làm) + features.md (queue tính năng HRM). |

## Backend (NestJS — apps/backend)

| Doc | Topic |
| --- | --- |
| [backend/architecture.md](backend/architecture.md) | Layers, DI, request lifecycle |
| [backend/conventions.md](backend/conventions.md) | Naming, file organization, do/don't |
| [backend/recipes/add-module.md](backend/recipes/add-module.md) | Step-by-step: create a feature module |
| [backend/recipes/add-cli-command.md](backend/recipes/add-cli-command.md) | Step-by-step: register a `pnpm cli <name>` command |
| [backend/recipes/auth-and-cookies.md](backend/recipes/auth-and-cookies.md) | JWT + httpOnly cookies + Bearer fallback |
| [backend/recipes/switch-database.md](backend/recipes/switch-database.md) | Postgres / MySQL / SQLite / SQL Server / MongoDB |
| [backend/recipes/storage-providers.md](backend/recipes/storage-providers.md) | local / S3 / GCS |
| [backend/reference/env-vars.md](backend/reference/env-vars.md) | Every env var BE đọc |
| [backend/reference/globals.md](backend/reference/globals.md) | What's injectable everywhere |

## Frontend (Next.js — apps/frontend)

| Doc | Topic |
| --- | --- |
| [frontend/domain.md](frontend/domain.md) | UX persona, route map, feature → folder mapping (FE-specific) |
| [frontend/architecture.md](frontend/architecture.md) | App Router, RSC vs Client, layers, request lifecycle |
| [frontend/conventions.md](frontend/conventions.md) | Naming, file organization, do/don't |
| [frontend/recipes/add-feature.md](frontend/recipes/add-feature.md) | Step-by-step: add a feature module |
| [frontend/recipes/add-page.md](frontend/recipes/add-page.md) | Step-by-step: add a route + view |
| [frontend/recipes/auth-flow.md](frontend/recipes/auth-flow.md) | Cookies + middleware + refresh-token interceptor |
| [frontend/recipes/theming.md](frontend/recipes/theming.md) | Design tokens, dark mode, animations |
| [frontend/recipes/icons.md](frontend/recipes/icons.md) | Adding brand icons + library options |
| [frontend/reference/env-vars.md](frontend/reference/env-vars.md) | Every env var FE reads |
| [frontend/reference/ui-tokens.md](frontend/reference/ui-tokens.md) | Animation utilities + scrollbar + design tokens |

## Updating docs

1. Edit the relevant `.md`. Keep frontmatter (`title`, `description`, `tags`) — the indexer uses it.
2. The PostToolUse hook in [.claude/settings.json](../.claude/settings.json) auto-rebuilds [index.json](index.json) on edit. Manual: `pnpm docs:index` from repo root.
3. Commit both the markdown change and the regenerated index.

The MCP server in [mcp/docs-server](../mcp/docs-server/index.js) reads `index.json` at startup — AI agents see new docs only after the index is regenerated.
