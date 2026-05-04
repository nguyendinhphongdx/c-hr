---
title: C-HR frontend — entry point cho AI agents
description: Trỏ về docs/ ở root. Đọc trước khi sửa code trong apps/frontend/.
tags: [overview, conventions, claude, c-hr, frontend]
---

# C-HR frontend — entry point

Đây là entry point cho AI agent khi làm việc trong [apps/frontend/](.). Tài liệu kiến trúc + quy ước **không** sống ở đây — chúng ở [docs/](../../docs/) (single source of truth cho cả monorepo).

> Bước tiếp theo: open [docs/frontend/](../../docs/frontend/README.md) cho Next.js-specific patterns, [docs/frontend/domain.md](../../docs/frontend/domain.md) cho UX route map, [docs/domain.md](../../docs/domain.md) cho HRM business domain (entity).

## Project at a glance

- **Project**: C-HR frontend — UI cho SaaS HRM (employees, departments, attendance, leave, payroll). Root monorepo: [../../CLAUDE.md](../../CLAUDE.md).
- **Stack**: Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui (Radix Nova) + TanStack Query + Zustand + axios + react-hook-form + zod.
- **Auth**: cookie-based (BE set httpOnly), edge middleware gate, axios refresh-token interceptor, TanStack Query for `me`.
- **Routing**: route groups `(auth)`, `(dashboard)` cho shared layouts (groups không xuất hiện trong URL).
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
7. **Brand icons live in [`@/components/icons`](src/components/icons/) — one file per icon, re-exported from `index.ts`.** UI icons (arrow, eye, settings, …) come from `lucide-react`. See [docs/frontend/recipes/icons.md](../../docs/frontend/recipes/icons.md).
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

Chạy từ root C-HR (preferred — workspace), hoặc trực tiếp trong `apps/frontend/`.

```bash
pnpm --filter @c-hr/frontend dev          # http://localhost:3000
pnpm --filter @c-hr/frontend build && pnpm --filter @c-hr/frontend start
pnpm --filter @c-hr/frontend lint
pnpm --filter @c-hr/frontend typecheck
pnpm --filter @c-hr/frontend check        # lint + typecheck
```

## Required reading by topic

- HRM domain (entity, invariant — chung cho BE+FE) → [docs/domain.md](../../docs/domain.md)
- FE-specific UX, route map, persona → [docs/frontend/domain.md](../../docs/frontend/domain.md)
- App Router, RSC vs Client, request lifecycle → [docs/frontend/architecture.md](../../docs/frontend/architecture.md)
- Naming, file organization, do/don't lists → [docs/frontend/conventions.md](../../docs/frontend/conventions.md)
- Env vars → [docs/frontend/reference/env-vars.md](../../docs/frontend/reference/env-vars.md)
- Animation utilities, design tokens → [docs/frontend/reference/ui-tokens.md](../../docs/frontend/reference/ui-tokens.md)
- Active work → [docs/plans/features.md](../../docs/plans/features.md)

## Subagents available

Đăng ký ở root [.claude/agents/](../../.claude/agents/). Dùng qua `Agent` tool:

| When to invoke | Subagent | What it does |
| --- | --- | --- |
| User asks for a code review or after a non-trivial edit | `code-reviewer` | Diffs the branch, walks the conventions checklist (BE+FE), runs verifications, returns a tight report |
| User asks to "create a page" / "scaffold a feature" (FE) | `page-scaffolder` | Asks clarifying questions, scaffolds a route + view per the recipe, runs typecheck |

## Tooling shortcuts

- **MCP server**: `c-hr-docs` (root [.mcp.json](../../.mcp.json)) — call `docs_list`, `docs_search`, `docs_read` instead of grepping markdown.
- **Hooks**: PostToolUse hook ở root [.claude/settings.json](../../.claude/settings.json) auto-rebuild `docs/index.json` khi edit MD.
- **Permissions allowlist** ở root [.claude/settings.json](../../.claude/settings.json) auto-approve safe commands. Destructive ops bị deny.

## Workflow expectations for AI agents

1. **Before editing**, read the relevant recipe or convention doc trong [docs/frontend/](../../docs/frontend/). Prefer `docs_search` MCP tool over grepping.
2. **After UI changes**, the `pnpm dev` server should reflect the change without errors before reporting done.
3. **After adding a route**, verify `pnpm --filter @c-hr/frontend build` succeeds (Next.js does extra route-level checks).
4. **After adding a feature module**, register any cross-cutting types in the feature's `index.ts` re-exports.
5. **Verify with `pnpm --filter @c-hr/frontend check`** before reporting done.
6. **Delegate to subagents** when the task fits one of them.
7. **Don't fabricate file paths** — use Read or Glob first.
8. **Don't run `pnpm docs:index` manually** — the hook handles it.
