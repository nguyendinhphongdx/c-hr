---
title: Documentation index
description: Two-tier docs — boilerplate-level (rarely changes) and project-level (you own).
tags: [overview, index]
---

# Documentation

Two tiers of documentation:

```text
docs/
├── boilerplate/        # ships with the template — DO NOT edit unless you change the architecture
└── project/            # YOUR project's docs — fill these in
```

When you spin up a new project from this template, only the `docs/project/` files need replacing — the architectural docs stay valid until the architecture itself changes.

## Boilerplate docs (HOW the codebase works)

| Doc | Topic |
| --- | --- |
| [boilerplate/architecture.md](boilerplate/architecture.md) | App Router, RSC vs Client, layers, request lifecycle |
| [boilerplate/conventions.md](boilerplate/conventions.md) | Naming, file organization, do/don't |
| [boilerplate/recipes/add-feature.md](boilerplate/recipes/add-feature.md) | Step-by-step: add a feature module |
| [boilerplate/recipes/add-page.md](boilerplate/recipes/add-page.md) | Step-by-step: add a route + view |
| [boilerplate/recipes/auth-flow.md](boilerplate/recipes/auth-flow.md) | Cookies + middleware + refresh-token interceptor |
| [boilerplate/recipes/theming.md](boilerplate/recipes/theming.md) | Design tokens, dark mode, animations |
| [boilerplate/recipes/icons.md](boilerplate/recipes/icons.md) | Adding brand icons + library options |
| [boilerplate/reference/env-vars.md](boilerplate/reference/env-vars.md) | Every env var the app reads |
| [boilerplate/reference/ui-tokens.md](boilerplate/reference/ui-tokens.md) | Animation utilities + scrollbar + design tokens |

## Project docs (WHAT this app does)

| Doc | Topic |
| --- | --- |
| [project/README.md](project/README.md) | Index + suggestions |
| [project/domain.md](project/domain.md) | Business model, glossary, invariants |
| [project/runbook.md](project/runbook.md) | On-call procedures, alerts, debugging |
| [project/deployment.md](project/deployment.md) | Environments, secrets, CI/CD |
| [project/decisions/](project/decisions/) | Architecture decision records (ADRs) |

The project files start as **templates**. Replace their content with reality.

## Updating docs

1. Edit the relevant `.md`. Keep frontmatter (`title`, `description`, `tags`) — the indexer uses it.
2. Run `pnpm docs:index` to regenerate [index.json](index.json).
3. Commit both the markdown change and the regenerated index.

The MCP server in [mcp/docs-server](../mcp/docs-server/index.js) reads `index.json` at startup, so AI agents see new docs only after the index is regenerated. A PostToolUse hook in `.claude/settings.json` regenerates it automatically when an agent edits any markdown file.
