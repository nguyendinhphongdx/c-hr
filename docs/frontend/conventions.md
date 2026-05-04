---
title: Conventions
description: Naming, file organization, and concrete do/don't rules.
tags: [conventions, style, naming]
---

# Conventions

## Naming

| Kind | Convention | Example |
| --- | --- | --- |
| File (component) | PascalCase | `LoginForm.tsx`, `BrandPanel.tsx` |
| File (hook) | kebab-case + `use-` or camelCase `useFoo.ts` | `use-mobile.ts`, `useAuth.ts` |
| File (route) | lowercase, kebab-case folder | `app/forgot-password/page.tsx` |
| File (helper) | kebab-case + `.util.ts` / `.types.ts` | `pagination.util.ts`, `user.types.ts` |
| Class | PascalCase | `Pagination`, `User` |
| Component | PascalCase | `function LoginForm()` |
| Hook | camelCase, prefix `use` | `function useAuth()` |
| Constant | SCREAMING_SNAKE | `MAX_PAGE_SIZE`, `LAST_EMAIL_KEY` |
| Boolean | `is*` / `has*` / `should*` | `isLoading`, `hasSession` |
| Folder | kebab-case for routes, lowercase for features | `(auth)/`, `landing/`, `auth/` |

## Feature folder structure

```text
src/features/<name>/
├── <name>.module.ts          # (optional) re-exports + public API for the feature
├── components/               # feature-local components — not exported globally
├── hooks/                    # TanStack Query hooks, custom React hooks
├── services/                 # axios calls — pure functions returning typed data
├── types/                    # interfaces + zod schemas (or co-located with forms)
├── views/                    # `*View.tsx` — top-level layouts wired to a route
└── index.ts                  # the public surface — only this is allowed to be imported by other features
```

`auth/` is the canonical example. Mirror its shape.

## RSC vs Client — practical defaults

| Component | Server (RSC) | Client (`"use client"`) |
| --- | --- | --- |
| Page (`page.tsx`) | Default | Only if it itself uses hooks |
| Route layout (`layout.tsx`) | **Always** unless impossible | Push state to a child shell instead |
| `*View.tsx` | If purely structural | If it owns interactive state |
| Form components | Always client | n/a |
| `metadata` export | Always server | (only metadata can't be in client) |

Push `"use client"` to the leaves. Don't sprinkle it on parent layouts.

## DTO vs interface — when to use what

This is **Next.js + RHF + zod**, not NestJS. There's no separate DTO layer.

| Where | What |
| --- | --- |
| HTTP input (form data) | `z.object({...})` schema in the form file. Type via `z.infer<typeof schema>`. |
| Service-to-service contract | TypeScript `interface` in `<feature>/types/index.ts` or `<feature>/<name>.types.ts`. |
| API response envelope | `ApiSuccess<T>`, `ApiList<T>` in `src/lib/api/types.ts`. |
| Cross-feature shared shape | `src/lib/types/common.ts`. |

**Don't** create a `dto/` folder.

## Imports

Order:

1. `react`, `next/*`, `react-dom`
2. External packages (alphabetical)
3. `@/...` aliases (alphabetical, grouped)
4. Relative imports (alphabetical)

Example (from `LoginForm.tsx`):

```ts
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, ... } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useLogin } from "../hooks/useAuth";
import { SocialAuthButtons } from "./SocialAuthButtons";
```

## Forms

- Schema: `z.object({...})` in the same file.
- Resolver: `zodResolver(schema)`.
- UI: shadcn `<Form>` + `<FormField>` (auto-wires labels, errors, ARIA).
- Submission: `mutateAsync` from a TanStack Query mutation, wrap in try/catch + `toast.error` on failure.
- Visual feedback: shake on error (`animate-shake` from `globals.css`).

See `LoginForm.tsx` and `RegisterForm.tsx` for the canonical pattern.

## Brand icons

`lucide-react@1.x` doesn't ship `Github` / `Google`. Use [@/components/icons](../../apps/frontend/src/components/icons/) — **one file per icon**, re-exported through `index.ts`. Each file:

- Exports a single component named `<Name>Icon`
- Accepts `IconProps` (`{ className, title }`)
- Uses `currentColor` so `text-*` utilities work
- Sets `aria-hidden` unless `title` is provided

Walkthrough + alternatives (simple-icons, iconify) → [recipes/icons.md](recipes/icons.md).

## Logging

- **Dev only** (`process.env.NODE_ENV === "development"`): `console.error` / `console.warn` are fine in catch blocks.
- **User-facing** errors → `sonner` toasts (`toast.error(...)`).
- **Production monitoring**: hook Sentry (or similar) into [src/app/error.tsx](../../apps/frontend/src/app/error.tsx) and [src/components/shared/ErrorBoundary.tsx](../../apps/frontend/src/components/shared/ErrorBoundary.tsx).

## State management

| Need | Tool |
| --- | --- |
| Server data (cache, refetch, optimistic) | TanStack Query |
| Client state, single-page | local `useState` |
| Client state, cross-component | Zustand store (`<feature>/store.ts`) |
| URL state (filters, pagination) | `useSearchParams` + `next/router` |

**Never** reach for React Context for state shared between components. Zustand is simpler and avoids re-render storms.

## What NOT to do

- ❌ `console.log` in committed code (use toasts or `console.error`).
- ❌ Edit anything in `src/components/ui/`. Re-add via shadcn CLI.
- ❌ `process.env.X` inside components — read via `SITE` or a config helper.
- ❌ `as any` to silence type errors. If a library type is wrong, type the value separately and document why.
- ❌ Create `dto/` folders. Schemas live with forms.
- ❌ Import another feature's internals — only its `index.ts`.
- ❌ Add state to parent layouts when you can push it to a child client component.
