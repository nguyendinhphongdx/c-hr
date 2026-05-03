#!/usr/bin/env node
/**
 * build-docs-index.js — scan markdown docs and emit docs/index.json.
 *
 * Indexes:
 *   - CLAUDE.md, AGENTS.md (repo root)
 *   - All *.md under docs/ (recursive)
 *
 * Each entry contains: id, path, title, description, tags, scope, category,
 * headings, summary. The MCP server in mcp/docs-server reads this file to
 * expose docs to AI agents.
 */
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(REPO_ROOT, "docs");
const OUT_FILE = path.join(DOCS_DIR, "index.json");

const ROOT_FILES = ["CLAUDE.md", "AGENTS.md"];

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      yield full;
    }
  }
}

/** Parse `--- yaml ---` frontmatter at the top. Returns { meta, body }. */
function parseFrontmatter(content) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(content);
  if (!match) return { meta: {}, body: content };

  const meta = {};
  for (const line of match[1].split("\n")) {
    const m = /^([\w-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, "");
    }
    meta[m[1]] = value;
  }
  return { meta, body: match[2] };
}

function extractHeadings(body) {
  const out = [];
  for (const line of body.split("\n")) {
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (m) out.push({ level: m[1].length, text: m[2] });
  }
  return out;
}

function extractFirstParagraph(body) {
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length && (!lines[i].trim() || lines[i].startsWith("#"))) i++;
  const start = i;
  while (i < lines.length && lines[i].trim()) i++;
  return lines
    .slice(start, i)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Top-level scope: where the doc lives.
 *   - 'root'        → CLAUDE.md, AGENTS.md
 *   - 'boilerplate' → docs/boilerplate/** (framework, ships with template)
 *   - 'project'     → docs/project/**     (this project)
 *   - 'overview'    → docs/README.md and other docs/* not under above
 */
function scopeFromPath(relPath) {
  if (!relPath.startsWith("docs/")) return "root";
  if (relPath.startsWith("docs/boilerplate/")) return "boilerplate";
  if (relPath.startsWith("docs/project/")) return "project";
  return "overview";
}

function categoryFromPath(relPath) {
  if (!relPath.startsWith("docs/")) return "root";
  const parts = relPath.split("/");
  if (parts.length === 2) return "overview";
  if (parts.length === 3) return parts[1];
  const folder = parts[2];
  return folder.endsWith("s") ? folder.slice(0, -1) : folder;
}

function buildEntry(absPath) {
  const rel = path.relative(REPO_ROOT, absPath).split(path.sep).join("/");
  const raw = fs.readFileSync(absPath, "utf8");
  const { meta, body } = parseFrontmatter(raw);

  const headings = extractHeadings(body);
  const firstH1 = headings.find((h) => h.level === 1);
  const title = meta.title || firstH1?.text || path.basename(rel, ".md");
  const description = meta.description || extractFirstParagraph(body).slice(0, 240);

  return {
    id: rel.replace(/\.md$/, "").replace(/[\/\\]/g, ":"),
    path: rel,
    title,
    description,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    scope: scopeFromPath(rel),
    category: categoryFromPath(rel),
    headings: headings.filter((h) => h.level >= 2 && h.level <= 3).map((h) => h.text),
    summary: extractFirstParagraph(body),
  };
}

function main() {
  const entries = [];

  for (const f of ROOT_FILES) {
    const p = path.join(REPO_ROOT, f);
    if (fs.existsSync(p)) entries.push(buildEntry(p));
  }

  if (fs.existsSync(DOCS_DIR)) {
    for (const file of walk(DOCS_DIR)) {
      entries.push(buildEntry(file));
    }
  }

  const scopeOrder = { root: 0, overview: 1, boilerplate: 2, project: 3 };
  const categoryOrder = {
    root: 0,
    overview: 1,
    boilerplate: 2,
    project: 3,
    architecture: 4,
    convention: 5,
    recipe: 6,
    reference: 7,
    decision: 8,
  };
  entries.sort((a, b) => {
    const sa = scopeOrder[a.scope] ?? 99;
    const sb = scopeOrder[b.scope] ?? 99;
    if (sa !== sb) return sa - sb;
    const ca = categoryOrder[a.category] ?? 99;
    const cb = categoryOrder[b.category] ?? 99;
    if (ca !== cb) return ca - cb;
    return a.path.localeCompare(b.path);
  });

  const output = {
    generatedAt: new Date().toISOString(),
    repoRelativeRoot: ".",
    count: entries.length,
    entries,
  };

  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log(`✔ Wrote ${entries.length} entries → ${path.relative(REPO_ROOT, OUT_FILE)}`);
}

main();
