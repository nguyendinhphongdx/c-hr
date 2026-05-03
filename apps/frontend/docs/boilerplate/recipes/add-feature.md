---
title: Add a feature module
description: Step-by-step recipe for adding a new feature under src/features/.
tags: [recipe, feature, scaffolding]
---

# Add a feature module

Suppose you're adding a `posts` feature with list/detail/create.

## 1. Folder skeleton

```text
src/features/posts/
├── components/                 # feature-local UI (PostCard, PostListItem, …)
├── hooks/
│   └── usePosts.ts             # TanStack Query hooks
├── services/
│   └── postsService.ts         # axios calls
├── types/
│   └── index.ts                # Post interface + filter types
├── views/
│   ├── PostListView.tsx
│   └── PostDetailView.tsx
└── index.ts                    # public re-exports
```

## 2. Types

```ts
// src/features/posts/types/index.ts
import type { ID, ISODate } from "@/lib/types";

export interface Post {
  id: ID;
  title: string;
  content: string;
  author_id: ID;
  created_at: ISODate;
}

export interface PostFilters {
  search?: string;
  page?: number;
}
```

## 3. Service (axios)

```ts
// src/features/posts/services/postsService.ts
import { apiClient } from "@/lib/api/client";
import type { ApiList } from "@/lib/api/types";
import type { Post, PostFilters } from "../types";

export const postsService = {
  list: async (filters: PostFilters = {}): Promise<ApiList<Post>> => {
    const res = await apiClient.get<ApiList<Post>>("/posts", { params: filters });
    return res.data;
  },

  get: async (id: string): Promise<Post> => {
    const res = await apiClient.get<Post>(`/posts/${id}`);
    return res.data;
  },

  create: async (data: Pick<Post, "title" | "content">): Promise<Post> => {
    const res = await apiClient.post<Post>("/posts", data);
    return res.data;
  },
};
```

## 4. Hooks (TanStack Query)

```ts
// src/features/posts/hooks/usePosts.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { postsService } from "../services/postsService";
import type { PostFilters } from "../types";

export const postsKeys = {
  all: ["posts"] as const,
  list: (filters: PostFilters) => [...postsKeys.all, "list", filters] as const,
  detail: (id: string) => [...postsKeys.all, "detail", id] as const,
};

export function usePosts(filters: PostFilters = {}) {
  return useQuery({
    queryKey: postsKeys.list(filters),
    queryFn: () => postsService.list(filters),
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: postsKeys.detail(id),
    queryFn: () => postsService.get(id),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postsKeys.all });
    },
  });
}
```

## 5. Views

```tsx
// src/features/posts/views/PostListView.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePosts } from "../hooks/usePosts";

export function PostListView() {
  const { data, isLoading } = usePosts();

  if (isLoading) return <div>Loading…</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data?.data.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <CardTitle>{post.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {post.content.slice(0, 120)}…
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## 6. Public surface (`index.ts`)

```ts
// src/features/posts/index.ts
export { PostListView } from "./views/PostListView";
export { PostDetailView } from "./views/PostDetailView";
export { usePosts, usePost, useCreatePost, postsKeys } from "./hooks/usePosts";
export { postsService } from "./services/postsService";
export type { Post, PostFilters } from "./types";
```

**Other features import only from `@/features/posts`** — never from `@/features/posts/services/...`.

## 7. Wire it to a route

See [add-page.md](add-page.md).

## 8. Verify

```bash
pnpm typecheck
pnpm dev
```

## Variants

- **Server-side data fetching**: in App Router you can fetch on the server and pass to a client view. Use `apiClient` from a server component (note: cookies aren't auto-forwarded — use `cookies()` from `next/headers`).
- **Optimistic updates**: see TanStack Query docs; use the `onMutate` callback pattern.
- **Pagination UI**: extend `PostFilters` with `page`/`pageSize` and create a small `<Pagination>` component.
