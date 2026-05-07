---
title: TanStack mutations
description: Standard pattern for mutations + cache invalidation + toast feedback in C-HR.
tags: [recipe, tanstack-query, mutations, ui]
---

# TanStack mutations

Server writes go through a `useMutation` hook in the feature's `hooks/` folder. UI components only call `mutateAsync(...)` and toast.

## 1. Service (axios)

```ts
// src/features/posts/services/postsService.ts
import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";
import type { Post, CreatePostInput, UpdatePostInput } from "../types";

export const postsService = {
  create: async (input: CreatePostInput): Promise<Post> => {
    const res = await apiClient.post<Post>("/posts", input);
    return res.data;
  },
  update: async (id: ID, input: UpdatePostInput): Promise<Post> => {
    const res = await apiClient.patch<Post>(`/posts/${id}`, input);
    return res.data;
  },
  remove: async (id: ID): Promise<void> => {
    await apiClient.delete(`/posts/${id}`);
  },
};
```

## 2. Hooks (TanStack)

```ts
// src/features/posts/hooks/usePosts.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postsService } from "../services/postsService";
import type { ID } from "@/lib/types";

export const postsKeys = {
  list: (query: ListPostsQuery) => ["posts", "list", query] as const,
  detail: (id: ID) => ["posts", "detail", id] as const,
  scope: () => ["posts"] as const,  // broad invalidate
};

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postsKeys.scope() });
    },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdatePostInput }) =>
      postsService.update(id, data),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: postsKeys.scope() });
      qc.setQueryData(postsKeys.detail(post.id), post);  // surgical update
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: postsKeys.scope() }),
  });
}
```

## 3. UI consumer

```tsx
// SomeComponent.tsx
const create = useCreatePost();

const onSubmit = async (values: FormValues) => {
  try {
    await create.mutateAsync(values);
    toast.success("Đã tạo");
    onClose();
  } catch (err) {
    toast.error(extractApiMessage(err) ?? "Tạo thất bại");
  }
};

// in JSX:
<Button disabled={create.isPending}>
  {create.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
  Tạo
</Button>
```

## Conventions

### Hook naming

- `useCreate<Entity>` / `useUpdate<Entity>` / `useDelete<Entity>`.
- Action-based: `useApprove<Entity>` / `useCancel<Entity>` for lifecycle.
- Always call them from the consuming component, never inside services.

### `mutateAsync` vs `mutate`

- **`mutateAsync`** for everything that needs a try/catch (most cases — toast on error, close dialog on success).
- **`mutate`** only for fire-and-forget side actions where you don't care about the outcome (rare).

### Cache key invalidation

- Define a `<entity>Keys.scope()` helper that returns the broad prefix (`["posts"]`).
- `onSuccess` invalidate `scope()` — TanStack matches all subkeys (lists with various filters, details).
- For surgical updates after `update`, also `setQueryData(detail(id), result)` so the detail view doesn't refetch when the response already carries the new shape.

### Optimistic updates

- Don't bother for V1 unless there's UX evidence (slow endpoint, jittery list). Standard refetch-on-success is fine.
- When you do, follow [TanStack's optimistic recipe](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) — context return for rollback.

### Error message extraction

BE wraps errors as `{ success: false, error: { code, message, details? } }`. Helper:

```ts
// src/lib/api/error.ts (already exists or add)
export function extractApiMessage(err: unknown): string | null {
  return (err as { response?: { data?: { error?: { message?: string } } } })
    ?.response?.data?.error?.message ?? null;
}
```

Use everywhere instead of inlining the cast chain.

### Toast contract

| Action | Title | Description |
|---|---|---|
| Create success | `Đã tạo` | optional: ("X có thể đăng nhập...") |
| Update success | `Đã cập nhật` | optional |
| Delete success | `Đã xoá` | optional |
| Generic failure | `extractApiMessage(err) ?? "Lưu thất bại"` | only when BE message is too cryptic |

Don't `console.error` in catch blocks unless there's specific debug value — toast is the user signal, error already flows to network panel.

### Don'ts

- Don't put mutations inside views. Always go through a hook.
- Don't catch errors silently in the hook. Let them bubble to the caller's try/catch.
- Don't `await` `mutateAsync` in `useEffect` — trigger from event handlers only.
- Don't pass the QueryClient down as a prop — call `useQueryClient()` inside the hook.
- Don't invalidate queries you don't own. If a mutation in feature A affects feature B's list, emit an event or trigger a custom invalidation utility — don't reach into B's keys.

## Reference

- `apps/frontend/src/features/employees/hooks/useEmployees.ts`
- `apps/frontend/src/features/requests/hooks/useRequests.ts`
- `apps/frontend/src/features/collaboration/hooks/useObjectComments.ts`
