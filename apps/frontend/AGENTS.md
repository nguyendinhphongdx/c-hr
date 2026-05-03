---
title: Agent instructions
description: Pointer to CLAUDE.md for non-Claude AI coding agents.
tags: [overview, agents]
---

# Agent instructions

This project uses [CLAUDE.md](CLAUDE.md) as the primary instruction file for AI agents. The conventions and rules apply to **any** AI agent (Cursor, Aider, Continue, Copilot Chat, etc.) — read it before making changes.

## Heads-up: not the Next.js you may know

Next.js 16 + React 19 introduced breaking changes from earlier majors. APIs, conventions, and file structure may differ from your training data. When in doubt, read the relevant guide in `node_modules/next/dist/docs/` (after `pnpm install`) and heed deprecation notices — don't trust memorized patterns.

## Where to look

- Repo conventions, file layout, hard rules → [CLAUDE.md](CLAUDE.md)
- Architecture, recipes, references → [docs/](docs/README.md)
- Per-project domain / runbook / deployment → [docs/project/](docs/project/README.md)

The local MCP server at [mcp/docs-server](mcp/docs-server/index.js) exposes the docs tree to AI agents through three tools (`docs_list`, `docs_search`, `docs_read`). Use them instead of scanning the filesystem.
