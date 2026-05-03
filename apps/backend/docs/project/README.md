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
| `integrations.md` | External services, APIs, message contracts |
| `data-model.md` | DB schema rationale, important migrations, indexes |
| `decisions/` | One file per ADR (architecture decision record) |

The starter files in this folder are templates — replace them with real content.

## Convention

- Add frontmatter (`title`, `description`, `tags`) to each file. The indexer ([scripts/build-docs-index.js](../../scripts/build-docs-index.js)) uses it to make docs searchable from the MCP server.
- Run `pnpm docs:index` after adding/renaming files.
- Keep project docs **short and concrete**. If something belongs to "how the framework works", it goes in `docs/boilerplate/` (and probably won't change).

## What goes where

| Topic | Folder |
| --- | --- |
| "Why does our domain model work this way?" | `docs/project/domain.md` |
| "How do I add a NestJS module?" | `docs/boilerplate/recipes/add-module.md` |
| "Where do I put database secrets in prod?" | `docs/project/deployment.md` |
| "What's `RequestContextService`?" | `docs/boilerplate/architecture.md` |

If you're not sure: project-specific = here, framework-level = `boilerplate/`.
