#!/usr/bin/env node
/**
 * init-project.js — set up a freshly-created project from this boilerplate template.
 *
 * Run after cloning/copying the boilerplate into a new project folder:
 *
 *   pnpm run init:project
 *
 * What it does:
 *   1. Sets `name` in package.json to the folder name (skips if already non-default)
 *   2. Creates .env from .env.example (skips if .env already exists)
 *   3. Initializes git history — but ONLY when appropriate:
 *        - No .git/ at all (e.g. came from `degit`)         → run `git init` + first commit
 *        - .git/ exists with NO remote                      → leave history alone, no-op
 *        - .git/ exists WITH a remote (GitHub Template / `gh repo create`) → leave history,
 *          DO NOT re-init (would destroy the link to the new GitHub repo)
 *
 * Idempotent: safe to re-run.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cwd = process.cwd();
const projectName = path.basename(cwd);
const DEFAULT_PKG_NAME = 'nestjs-boilerplate';

console.log(`→ Initializing project: ${projectName}`);

// ────────────────────────────────────────────────────────
// 1. package.json name
// ────────────────────────────────────────────────────────
const pkgPath = path.join(cwd, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  // Only rename if it still has the default boilerplate name; don't overwrite
  // a previously-set custom name on re-run.
  if (pkg.name === DEFAULT_PKG_NAME && projectName !== DEFAULT_PKG_NAME) {
    pkg.name = projectName;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  ✔ package.json name → ${projectName}`);
  } else {
    console.log(`  • package.json name unchanged (${pkg.name})`);
  }
}

// ────────────────────────────────────────────────────────
// 2. .env from .env.example
// ────────────────────────────────────────────────────────
const envExample = path.join(cwd, '.env.example');
const envFile = path.join(cwd, '.env');
if (fs.existsSync(envExample) && !fs.existsSync(envFile)) {
  fs.copyFileSync(envExample, envFile);
  console.log('  ✔ .env created from .env.example');
} else if (fs.existsSync(envFile)) {
  console.log('  • .env already exists — left alone');
}

// ────────────────────────────────────────────────────────
// 3. Git init (smart: respect existing remotes)
// ────────────────────────────────────────────────────────
const gitDir = path.join(cwd, '.git');
const hasGitDir = fs.existsSync(gitDir);

let hasRemote = false;
if (hasGitDir) {
  try {
    const remotes = execSync('git remote', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    hasRemote = remotes.trim().length > 0;
  } catch {
    hasRemote = false;
  }
}

if (!hasGitDir) {
  // Came from degit / local copy — no .git/ yet. Initialize fresh.
  try {
    execSync('git init -q', { stdio: 'inherit', cwd });
    execSync('git add -A', { stdio: 'inherit', cwd });
    execSync('git commit -q -m "chore: bootstrap from nestjs-boilerplate"', { stdio: 'inherit', cwd });
    console.log('  ✔ Fresh git repository initialized');
  } catch (e) {
    console.warn('  ⚠ git init failed:', e.message);
  }
} else if (hasRemote) {
  // Cloned from GitHub Template (`gh repo create --template`, or "Use this template" + git clone).
  // The .git/ already points to your NEW GitHub repo — re-initing would destroy that link.
  console.log('  • .git/ already exists with a remote — preserving (likely from GitHub Template)');
} else {
  // .git/ exists but no remote configured. Leave it alone; user can wire it up themselves.
  console.log('  • .git/ already exists (no remote) — leaving history as-is');
}

// ────────────────────────────────────────────────────────
// Done
// ────────────────────────────────────────────────────────
console.log(`
✔ Project ready: ${projectName}

Next:
  1. Edit .env (DATABASE_URL, JWT secrets, …)
  2. docker compose -f docker-compose.dev.yml up -d
  3. pnpm prisma:migrate
  4. pnpm prisma:seed
  5. pnpm start:dev
`);
