---
title: C-HR frontend — agent instructions
description: Pointer to CLAUDE.md + root docs/. Apply to any non-Claude AI coding agent (Cursor, Aider, Continue, Copilot Chat).
tags: [overview, agents, frontend, c-hr]
---

# Agent instructions — C-HR frontend

This app is part of the C-HR monorepo. **Read in this order:**

1. [CLAUDE.md](CLAUDE.md) (this app) — quick rules + entry point.
2. [../../docs/frontend/](../../docs/frontend/README.md) — Next.js architecture, conventions, recipes, reference + UX domain.
3. [../../docs/frontend/domain.md](../../docs/frontend/domain.md) — UX persona + route map.
4. [../../docs/domain.md](../../docs/domain.md) — HRM business model (entity, invariant — chung BE+FE).
5. [../../docs/decisions/](../../docs/decisions/) — ADRs.
6. [../../CLAUDE.md](../../CLAUDE.md) — root cross-cutting (docker, scripts, env layering).

## Heads-up: not the Next.js you may know

Next.js 16 + React 19 introduced breaking changes from earlier majors. APIs, conventions, and file structure may differ from your training data. When in doubt, read the relevant guide in `node_modules/next/dist/docs/` (after `pnpm install`) and heed deprecation notices — don't trust memorized patterns.

## MCP

All docs live at root [`docs/`](../../docs/). Use the MCP server `c-hr-docs` ([../../mcp/docs-server](../../mcp/docs-server/)) with `docs_list`, `docs_search`, `docs_read` instead of grepping markdown.
