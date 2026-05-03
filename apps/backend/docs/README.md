---
title: Documentation index
description: Two-tier docs — boilerplate-level (rarely changes) and project-level (you own).
tags: [overview, index]
---

# Documentation

This project has **two tiers of documentation**:

```
docs/
├── boilerplate/        # ships with the boilerplate. DO NOT edit unless you change the architecture.
└── project/            # YOUR project's docs. Fill these in.
```

Why split? When you spin up a new project from this boilerplate, you keep the framework docs as-is and only write the project-specific parts. Architectural docs don't get out-of-date because they're not duplicated per-project.

## Boilerplate docs (read these to understand HOW the codebase works)

| Doc | Topic |
| --- | --- |
| [boilerplate/architecture.md](boilerplate/architecture.md) | Layers, DI, request lifecycle |
| [boilerplate/conventions.md](boilerplate/conventions.md) | Naming, file organization, do/don't |
| [boilerplate/recipes/add-module.md](boilerplate/recipes/add-module.md) | Step-by-step: create a feature module |
| [boilerplate/recipes/add-cli-command.md](boilerplate/recipes/add-cli-command.md) | Step-by-step: register a `pnpm cli <name>` command |
| [boilerplate/recipes/auth-and-cookies.md](boilerplate/recipes/auth-and-cookies.md) | JWT + httpOnly cookies + Bearer fallback |
| [boilerplate/recipes/switch-database.md](boilerplate/recipes/switch-database.md) | Postgres / MySQL / SQLite / SQL Server / MongoDB |
| [boilerplate/recipes/storage-providers.md](boilerplate/recipes/storage-providers.md) | local / S3 / GCS |
| [boilerplate/reference/env-vars.md](boilerplate/reference/env-vars.md) | Every env var |
| [boilerplate/reference/globals.md](boilerplate/reference/globals.md) | What's injectable everywhere |

## Project docs (read these to understand WHAT this app does)

| Doc | Topic |
| --- | --- |
| [project/README.md](project/README.md) | Index + suggestions for what to write |
| [project/domain.md](project/domain.md) | Business model, glossary, invariants |
| [project/runbook.md](project/runbook.md) | On-call procedures, alerts, debugging |
| [project/deployment.md](project/deployment.md) | Environments, secrets, CI/CD |
| [project/decisions/](project/decisions/) | Architecture decision records (ADRs) |

The project files start as **templates**. Replace their content with reality.

## Updating docs

1. Edit the relevant `.md`. Keep frontmatter (`title`, `description`, `tags`) — the indexer uses it.
2. Run `pnpm docs:index` to regenerate [index.json](index.json).
3. Commit both the markdown change and the regenerated index.

The MCP server in [mcp/docs-server](../mcp/docs-server/index.js) reads `index.json` at startup, so AI agents see new docs only after the index is regenerated.
