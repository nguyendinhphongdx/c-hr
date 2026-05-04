# C-HR docs MCP server

A small [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the C-HR monorepo docs (root `CLAUDE.md` / `AGENTS.md` / `README.md`, everything under `docs/`, and per-app `apps/<name>/CLAUDE.md`) to AI agents like Claude Code.

## What it does

- Reads [`docs/index.json`](../../docs/index.json) (built by `pnpm docs:index` at the repo root).
- Speaks MCP over **stdio** — runs as a child process of the agent host.
- Exposes 3 tools:
  - **`docs_list`** — list all indexed docs (optional `scope` filter: `root` | `app` | `overview` | `backend` | `frontend` | `decision` | `plan`).
  - **`docs_search`** — keyword search across title / description / summary / headings / tags / path.
  - **`docs_read`** — fetch full markdown content of a single doc by `path` or `id`.

## Wire it up

The repo-root [.mcp.json](../../.mcp.json) already registers this server as `c-hr-docs`. Claude Code auto-discovers it when you open the project.

```json
{
  "mcpServers": {
    "c-hr-docs": {
      "command": "node",
      "args": ["mcp/docs-server/index.js"]
    }
  }
}
```

## Regenerate the index

A `PostToolUse` hook in [.claude/settings.json](../../.claude/settings.json) re-runs `node scripts/build-docs-index.js` whenever an agent edits `CLAUDE.md`, `AGENTS.md`, `README.md`, or any `docs/**/*.md`. Manual rebuild:

```bash
pnpm docs:index
```
