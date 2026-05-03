# Docs MCP server

A tiny [Model Context Protocol](https://modelcontextprotocol.io) server that exposes this project's docs (`CLAUDE.md`, `AGENTS.md`, `docs/**`) to AI agents like Claude Code.

## What it does

- Reads [`docs/index.json`](../../docs/index.json) (built by `pnpm docs:index`).
- Speaks MCP over **stdio**, so it runs as a child process of the agent host (Claude Code, Cursor, etc.).
- Exposes 3 tools:
  - **`docs_list`** — list all indexed docs (optional `scope` filter: `root` | `boilerplate` | `project` | `overview`).
  - **`docs_search`** — keyword search across title / description / summary / headings / tags / path.
  - **`docs_read`** — fetch full markdown content of a single doc by `path` or `id`.

The agent decides when to call them; you don't have to load all docs into context up front.

## Install

The server lives inside this repo. Install its single dependency:

```bash
pnpm install              # from the repo root, reads /mcp/docs-server only on demand
# or, scoped:
cd mcp/docs-server && pnpm install
```

## Wire it up to Claude Code

There's already a [.mcp.json](../../.mcp.json) at the repo root that registers this server. Claude Code auto-discovers it when you open the project. The config is:

```json
{
  "mcpServers": {
    "boilerplate-docs": {
      "command": "node",
      "args": ["mcp/docs-server/index.js"]
    }
  }
}
```

You can also wire it manually for other clients via `claude mcp add` or by editing your client's MCP config.

## Manual smoke test

```bash
# In one terminal:
node mcp/docs-server/index.js

# In another, send a JSON-RPC request via stdin (or use any MCP client).
```

Realistically just trust Claude Code to call it. If it's not working, regenerate the index:

```bash
pnpm docs:index
```
