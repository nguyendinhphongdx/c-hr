#!/usr/bin/env node
/**
 * C-HR docs MCP server.
 *
 * Exposes the C-HR monorepo docs (root CLAUDE.md/AGENTS.md/README.md, docs/**,
 * apps/<name>/CLAUDE.md) over the Model Context Protocol (stdio transport) so
 * AI agents like Claude Code can discover and read docs on demand instead of
 * loading the whole tree into context.
 *
 * Tools:
 *   - docs_list   → list all indexed docs (with scope, category, title, summary)
 *   - docs_search → keyword search over title/description/summary/headings/tags
 *   - docs_read   → return the full markdown content of a doc by path or id
 *
 * The server reads docs/index.json (built by `pnpm docs:index`). If the index is
 * missing or stale, run `pnpm docs:index` to regenerate.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const INDEX_PATH = join(REPO_ROOT, 'docs', 'index.json');

function loadIndex() {
  if (!existsSync(INDEX_PATH)) {
    return {
      generatedAt: null,
      count: 0,
      entries: [],
      _error: `docs/index.json not found. Run \`pnpm docs:index\` to generate it.`,
    };
  }
  return JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
}

function readDocFile(relPath) {
  const absPath = resolve(REPO_ROOT, relPath);
  // Guard against path traversal
  if (!absPath.startsWith(REPO_ROOT)) {
    throw new Error(`Refused: path escapes repository root: ${relPath}`);
  }
  if (!existsSync(absPath)) {
    throw new Error(`Doc not found: ${relPath}`);
  }
  return readFileSync(absPath, 'utf8');
}

function matches(entry, query) {
  const q = query.toLowerCase();
  const hay = [
    entry.title,
    entry.description,
    entry.summary,
    (entry.tags || []).join(' '),
    (entry.headings || []).join(' '),
    entry.path,
  ]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase();
  return hay.includes(q);
}

const TOOLS = [
  {
    name: 'docs_list',
    description:
      'List all indexed docs in the C-HR monorepo. Each entry has: id, path, title, description, scope (root|app|overview|backend|frontend|decision|plan), category, tags. Use this to discover what docs exist before searching or reading.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['root', 'app', 'overview', 'backend', 'frontend', 'decision', 'plan'],
          description:
            'Optional filter. root = repo-root CLAUDE/AGENTS/README; app = apps/<name>/CLAUDE; overview = docs/<file>.md (domain, runbook, deployment); backend/frontend = stack-specific patterns; decision = ADRs; plan = active work plans.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'docs_search',
    description:
      'Keyword search across all docs (title, description, summary, headings, tags, path). Returns matching entries (no full content). Follow up with docs_read to fetch a specific doc.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Substring to search for (case-insensitive).' },
        scope: {
          type: 'string',
          enum: ['root', 'app', 'overview', 'backend', 'frontend', 'decision', 'plan'],
          description: 'Optional scope filter.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          default: 10,
          description: 'Max number of results to return.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'docs_read',
    description:
      'Return the full markdown content of a doc, identified by either its `path` (e.g. `docs/backend/conventions.md` or `CLAUDE.md`) or `id` (from docs_list).',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Repo-relative path to the markdown file.' },
        id: { type: 'string', description: 'Index id (alternative to path).' },
      },
      additionalProperties: false,
    },
  },
];

function jsonResult(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function textResult(text) {
  return { content: [{ type: 'text', text }] };
}

function handleList(args) {
  const { entries } = loadIndex();
  const filtered = args?.scope ? entries.filter((e) => e.scope === args.scope) : entries;
  return jsonResult({
    count: filtered.length,
    entries: filtered.map((e) => ({
      id: e.id,
      path: e.path,
      title: e.title,
      description: e.description,
      scope: e.scope,
      category: e.category,
      tags: e.tags,
    })),
  });
}

function handleSearch(args) {
  const { query, scope, limit = 10 } = args || {};
  if (!query || typeof query !== 'string') {
    throw new Error('`query` is required and must be a string');
  }
  const { entries } = loadIndex();
  const pool = scope ? entries.filter((e) => e.scope === scope) : entries;
  const hits = pool.filter((e) => matches(e, query)).slice(0, limit);
  return jsonResult({
    query,
    scope: scope || 'all',
    count: hits.length,
    entries: hits.map((e) => ({
      id: e.id,
      path: e.path,
      title: e.title,
      description: e.description,
      scope: e.scope,
      category: e.category,
      tags: e.tags,
    })),
  });
}

function handleRead(args) {
  const { path: relPath, id } = args || {};
  let target = relPath;
  if (!target && id) {
    const { entries } = loadIndex();
    const found = entries.find((e) => e.id === id);
    if (!found) throw new Error(`No doc with id: ${id}`);
    target = found.path;
  }
  if (!target) {
    throw new Error('Provide either `path` or `id`.');
  }
  const content = readDocFile(target);
  return textResult(content);
}

const server = new Server(
  {
    name: 'c-hr-docs',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    switch (name) {
      case 'docs_list':
        return handleList(args);
      case 'docs_search':
        return handleSearch(args);
      case 'docs_read':
        return handleRead(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${e.message}` }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
