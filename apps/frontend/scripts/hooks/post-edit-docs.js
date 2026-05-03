#!/usr/bin/env node
/**
 * post-edit-docs.js — Claude Code PostToolUse hook.
 *
 * After an Edit/Write/MultiEdit tool call, if the touched file is a doc
 * (CLAUDE.md, AGENTS.md, or anything under docs/*.md), rebuild docs/index.json
 * so the MCP server stays current. Silent on no-op; errors don't block the agent.
 *
 * Wired in .claude/settings.json under hooks.PostToolUse.
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = event?.tool_input?.file_path || "";
  if (!isDoc(filePath)) process.exit(0);

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const indexer = path.join(projectDir, "scripts", "build-docs-index.js");

  spawnSync("node", [indexer], {
    cwd: projectDir,
    stdio: "ignore",
  });

  // Always exit cleanly — never block the agent on hook errors.
  process.exit(0);
});

function isDoc(p) {
  if (!p) return false;
  if (p.endsWith("CLAUDE.md") || p.endsWith("AGENTS.md")) return true;
  return p.includes(`${path.sep}docs${path.sep}`) && p.endsWith(".md");
}
