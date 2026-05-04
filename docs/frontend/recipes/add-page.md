---
title: Add a page (route)
description: Step-by-step recipe for adding a new App Router page that delegates UI to a feature view.
tags: [recipe, page, route, app-router]
---

# Add a page

Pages live under `src/app/`. The convention is **page = thin wrapper, view = the actual UI** — keeps routes hot-swappable.

## Public page (e.g. `/about`)

```text
src/app/about/page.tsx
```

```tsx
import { createMetadata } from "@/lib/seo";
import { AboutView } from "@/features/about";

export const metadata = createMetadata({
  title: "About",
  path: "/about",
  description: "Learn more about us.",
});

export default function AboutPage() {
  return <AboutView />;
}
```

## Protected page (under `(dashboard)/` group)

```text
src/app/(dashboard)/posts/page.tsx
```

```tsx
import { createMetadata } from "@/lib/seo";
import { PostListView } from "@/features/posts";

export const metadata = createMetadata({
  title: "Posts",
  path: "/posts",
  noIndex: true,
});

export default function PostsPage() {
  return <PostListView />;
}
```

The `(dashboard)` route group automatically:

- Wraps the page in `DashboardShell` (sidebar, header, AuthGuard)
- Is gated by `src/middleware.ts`

## Dynamic route (e.g. `/posts/:id`)

```text
src/app/(dashboard)/posts/[id]/page.tsx
```

```tsx
import { notFound } from "next/navigation";
import { createMetadata } from "@/lib/seo";
import { PostDetailView } from "@/features/posts";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return createMetadata({
    title: `Post ${id}`,
    path: `/posts/${id}`,
    noIndex: true,
  });
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  if (!id) notFound();
  return <PostDetailView id={id} />;
}
```

> Next.js 16: `params` and `searchParams` are **Promises** in App Router server components. `await` them.

## Page that needs query params

If the view uses `useSearchParams()`, wrap it in `<Suspense>`:

```tsx
// app/(auth)/verify-otp/page.tsx
import { Suspense } from "react";
import { VerifyOtpView } from "@/features/auth";

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<VerifyOtpView />}>
      <VerifyOtpRouteHandler />
    </Suspense>
  );
}
```

The handler is a client component that reads `useSearchParams()` and forwards values to the view as props.

## Add to sitemap (public pages only)

If the page is public and indexable:

```ts
// src/app/sitemap.ts
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/about",          // ← add here
];
```

## Verify

```bash
pnpm typecheck
pnpm dev
# open http://localhost:3000/<your-route>
```
