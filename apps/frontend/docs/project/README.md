---
title: Project documentation
description: Project-specific docs — fill these in for your application. Boilerplate-level docs are in ../boilerplate/.
tags: [overview, project]
---

# Project documentation

This folder is **yours to write**. The boilerplate ships with [docs/boilerplate/](../boilerplate/README.md), which describes the framework patterns and shouldn't change unless you change the architecture.

`docs/project/` is where you describe **this specific application**:

| Suggested file | Contains |
| --- | --- |
| `domain.md` | Business model, entities, glossary, key invariants |
| `runbook.md` | On-call procedures, common alerts, how to debug X |
| `deployment.md` | Environments, secrets management, CI/CD pipeline, rollout/rollback |
| `decisions/` | One file per ADR (architecture decision record) |

The starter files in this folder are templates — replace them with real content.

## Convention

- Add frontmatter (`title`, `description`, `tags`) to each file. The indexer ([scripts/build-docs-index.js](../../scripts/build-docs-index.js)) uses it to make docs searchable from the MCP server.
- Run `pnpm docs:index` after adding/renaming files (the PostToolUse hook does this for AI agents automatically).
- Keep project docs **short and concrete**. If something belongs to "how the framework works", it goes in `docs/boilerplate/`.

## What goes where

| Topic | Folder |
| --- | --- |
| "Why does our domain model work this way?" | `docs/project/domain.md` |
| "How do I add a new feature module?" | `docs/boilerplate/recipes/add-feature.md` |
| "Where do I put database secrets in prod?" | `docs/project/deployment.md` |
| "What's `<Reveal>`?" | `docs/boilerplate/reference/ui-tokens.md` |

If unsure: project-specific = here, framework-level = `boilerplate/`.
