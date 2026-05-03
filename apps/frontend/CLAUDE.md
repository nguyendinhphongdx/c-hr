---
title: Project conventions for Claude Code
description: Read this first. Concise rules of the road for any AI agent working in this Next.js boilerplate.
tags: [overview, conventions, claude]
---

# Project conventions for Claude Code

Entry point for any AI agent (Claude Code, Cursor, Aider, …) working in this codebase. **Read it before making any change.**

For deeper detail, see [docs/](docs/README.md). All docs are also indexed in [docs/index.json](docs/index.json) and exposed through the local MCP server at [mcp/docs-server](mcp/docs-server/index.js). Prefer the MCP tools `docs_list`, `docs_search`, `docs_read` over scanning the whole tree.

---

## Project at a glance

- **Project**: C-HR frontend — UI cho SaaS HRM (employees, departments, attendance, leave, payroll). Root monorepo: see [../../CLAUDE.md](../../CLAUDE.md).
- **Stack**: Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui (Radix Nova) + TanStack Query + Zustand + axios + react-hook-form + zod
- **Auth**: cookie-based (BE set httpOnly), edge middleware gate, axios refresh-token interceptor, TanStack Query for `me`
- **Routing**: route groups `(auth)`, `(dashboard)` cho shared layouts (groups không xuất hiện trong URL)
- **Backend API**: `http://localhost:8000/api/v1` ở dev (`NEXT_PUBLIC_API_URL`). Cookies httpOnly do BE set — đừng đụng `document.cookie` ở FE.

## Layout cheat sheet

```text
src/
├── app/                    # Next.js App Router — routes, metadata, error/loading/not-found
│   ├── (auth)/             # public auth routes (login, register, forgot, reset, verify-otp, verify-email)
│   ├── (dashboard)/        # gated routes (home, settings) — middleware-protected
│   ├── layout.tsx          # root layout (RSC) — wraps Providers, font, metadata
│   ├── error.tsx           # global error boundary
│   ├── loading.tsx         # streaming loading state
│   └── not-found.tsx       # 404
├── components/
│   ├── icons/              # shared inline SVG brand icons — one file per icon, re-exported from index.ts
│   ├── layout/             # Header, Sidebar, AuthGuard, DashboardShell, ThemeToggle
│   ├── providers/          # Providers tree (Query, Theme, Tooltip, Toaster)
│   ├── shared/             # ErrorBoundary etc.
│   └── ui/                 # shadcn/ui primitives — DO NOT edit by hand, use shadcn CLI
├── features/               # feature modules — `<name>/{components,hooks,services,types,views}`
│   ├── auth/               # the canonical reference module — copy its shape
│   ├── dashboard/
│   ├── landing/
│   └── settings/
├── hooks/                  # cross-feature React hooks
├── lib/
│   ├── api/                # axios client + endpoints + envelope types
│   ├── seo/                # createMetadata, sitemap, robots, JSON-LD
│   ├── types/              # shared primitive types (ID, ISODate, Pagination, …)
│   └── utils.ts            # cn() and other small utils
└── middleware.ts           # edge auth gate for protected routes
```

## Hard rules — DO NOT violate

1. **Never put `process.env.X` in components/services.** Read via `lib/seo/site.ts` or proper config helpers. `NEXT_PUBLIC_*` env vars are exposed at build time.
2. **Never edit files in `src/components/ui/`** by hand — those are shadcn-generated. Re-run `pnpm dlx shadcn@latest add <component>` instead.
3. **Default to Server Components.** Add `"use client"` only at the leaf that actually needs hooks/state/effects/refs/event handlers.
4. **Forms always use `react-hook-form` + `zod` + the shadcn `<Form>` wrapper.** Schemas live next to their forms; types are inferred via `z.infer<typeof schema>`.
5. **Throw early, errors as values.** Use `toast.error(...)` for user feedback; `console.log` only in dev (and prefer `console.error` in catch blocks).
6. **One feature folder = one bounded slice.** Don't import another feature's internals — only its `index.ts` re-exports.
7. **Brand icons live in [`@/components/icons`](src/components/icons/) — one file per icon, re-exported from `index.ts`.** UI icons (arrow, eye, settings, …) come from `lucide-react`. See [docs/boilerplate/recipes/icons.md](docs/boilerplate/recipes/icons.md).
8. **Keep imports ordered**: `react/next` → external → `@/*` aliases → relative. Re-exports per folder via `index.ts`.
9. **No comments narrating code.** Comments explain *why* (a non-obvious constraint), never *what*.

## When to put code where

| Question | Answer |
| --- | --- |
| HTTP/data call? | `<feature>/services/*.ts` (axios via `apiClient`) |
| Server-state cache / mutation? | `<feature>/hooks/use*.ts` (TanStack Query) |
| Client-only state? | local `useState` or `<feature>/store.ts` (Zustand) — never Context for shared state |
| New page? | `src/app/<route>/page.tsx` (RSC) — delegate UI to `<feature>/views/*View.tsx` |
| Validated input? | schema in the form file via `zod`, not a separate dto |
| Reused across ≥ 2 features? | `src/components/...` (UI) or `src/lib/...` (logic) |
| Edge gate / redirect? | `src/middleware.ts` |
| Brand or app-wide icon? | `src/components/icons/index.tsx` |
| Site-wide config (name, urls)? | `src/lib/seo/site.ts` (single source of truth) |

## Common commands

```bash
pnpm install
pnpm dev                     # dev server (http://localhost:3000)
pnpm build && pnpm start     # production build + serve
pnpm lint
pnpm typecheck
pnpm check                   # lint + typecheck
pnpm docs:index              # regenerate docs/index.json
```

## Two tiers of docs

- [docs/boilerplate/](docs/boilerplate/README.md) — framework patterns (architecture, conventions, recipes). **Don't edit unless changing the architecture.**
- [docs/project/](docs/project/README.md) — this project's domain, runbook, deployment. **You own these.**

When the user asks about *how the codebase works* → look in `boilerplate/`. When they ask about *what this app does* → look in `project/`.

## Quick recipes

- **New feature module** → [docs/boilerplate/recipes/add-feature.md](docs/boilerplate/recipes/add-feature.md)
- **New page** → [docs/boilerplate/recipes/add-page.md](docs/boilerplate/recipes/add-page.md)
- **Auth + cookies + middleware** → [docs/boilerplate/recipes/auth-flow.md](docs/boilerplate/recipes/auth-flow.md)
- **Theming / design tokens** → [docs/boilerplate/recipes/theming.md](docs/boilerplate/recipes/theming.md)

## Required reading by topic

- App Router, RSC vs Client, request lifecycle → [docs/boilerplate/architecture.md](docs/boilerplate/architecture.md)
- Naming, file organization, do/don't lists → [docs/boilerplate/conventions.md](docs/boilerplate/conventions.md)
- Env vars → [docs/boilerplate/reference/env-vars.md](docs/boilerplate/reference/env-vars.md)
- Animation utilities, design tokens → [docs/boilerplate/reference/ui-tokens.md](docs/boilerplate/reference/ui-tokens.md)

## Subagents available

Two specialized subagents live in `.claude/agents/`. Use them via the `Agent` tool:

| When to invoke | Subagent | What it does |
| --- | --- | --- |
| User asks for a code review or after a non-trivial edit | `code-reviewer` | Diffs the branch, walks the conventions checklist, runs `pnpm check`, returns a tight report |
| User asks to "create a page" / "scaffold a feature" | `page-scaffolder` | Asks clarifying questions, scaffolds a route + view per the recipe, runs typecheck |

## Tooling shortcuts

- **MCP server**: `boilerplate-docs` (auto-registered via [.mcp.json](.mcp.json)) — call `docs_list`, `docs_search`, `docs_read` instead of grepping markdown.
- **Hooks**: a PostToolUse hook auto-rebuilds `docs/index.json` whenever you edit `CLAUDE.md`, `AGENTS.md`, or any `docs/**/*.md`. You don't need to run `pnpm docs:index` manually.
- **Permissions allowlist** (`.claude/settings.json`) auto-approves safe commands (`pnpm dev`, `pnpm build`, `pnpm check`, `git status`, `git diff`, …). Destructive ops are explicitly denied.

## Workflow expectations for AI agents

1. **Before editing**, read the relevant recipe or convention doc. Prefer the `docs_search` MCP tool over grepping.
2. **After UI changes**, the `pnpm dev` server should reflect the change without errors before reporting done.
3. **After adding a route**, verify `pnpm build` succeeds (Next.js does extra route-level checks).
4. **After adding a feature module**, register any cross-cutting types in the feature's `index.ts` re-exports.
5. **Verify with `pnpm check`** before reporting done — TS catches the easy mistakes.
6. **Delegate to subagents** when the task fits one of them. Don't do their job in the main thread.
7. **Don't fabricate file paths** — if unsure, use Read or `Glob` first.
8. **Don't run `pnpm docs:index` manually** — the hook handles it.
