---
title: Dialog layout
description: Standard layout, sizing, ordering, and footer rules for shadcn Dialogs in C-HR. Apply to every Dialog so the UI feels uniform.
tags: [recipe, dialog, ui, forms]
---

# Dialog layout

Every Dialog in C-HR (Create, Edit, Detail) follows the same anatomy. Reference implementations: `EventCreateDialog`, `RequestCreateDialog`, `EmployeeCreateDialog`, `EditRequestDialog`, `EventDetailDialog`.

## Anatomy (top-down)

```text
┌─ DialogContent ──────────────────────── [X] ←  always present (shadcn default)
│  DialogHeader
│    DialogTitle      ← required (radix a11y)
│    DialogDescription? ← muted, 1 short sentence
│  ─────────────────────────────────────
│  Body (overflow-y-auto, p-6)
│    Form / content
│  ─────────────────────────────────────
│  DialogFooter (right-aligned)
│    [Huỷ] [Xoá?] [Tạo|Lưu]    ← primary on the right
└────────────────────────────────────────
```

## Sizes

Apply via `<DialogContent className="sm:max-w-...">`.

| Use case | Class |
|---|---|
| Confirm / single field | `sm:max-w-sm` |
| Standard form (1 column) | `sm:max-w-xl` |
| Form with many sections / 2-col field pairs | `sm:max-w-2xl` |
| Detail with sidebar / 2-column layout | `sm:max-w-4xl` |
| Wide list / timeline | `sm:max-w-5xl` |

## Form field rules

1. Label above input. `FormDescription` xs muted *below* input when needed.
2. Stack vertically by default — `space-y-4` on the form.
3. **2-column only for tightly related pairs**: `<date, time>`, `<startAt, endAt>`, `<email, password>`. Use `grid gap-4 md:grid-cols-2`.
4. Auto-focus the identifying field (title/name/email).
5. Standard ordering: identifier → time → location → people → resources/relations → description (always last; richtext if needed).

## Language

- Title: `Tạo <X>` / `Sửa <X>` / `Chi tiết <X>` — Vietnamese.
- Description: 1 short sentence ("Điền thông tin để tạo cuộc họp.").
- Buttons: `Huỷ` / `Tạo` / `Lưu` / `Xoá`. Don't mix English.

## Footer rules

- **Don't add a "Đóng" button** — the corner X (shadcn default) handles it.
- Cancel button (`Huỷ`, ghost) only when the user is editing (losing typed input matters). Detail / read-only Dialogs don't need it.
- Destructive (`Xoá`, `variant="destructive"`) sits between cancel and primary, OR before primary when no cancel.
- Footer renders only when there are real actions. Drop the whole `<DialogFooter>` for read-only states.
- Loading: `disabled={isPending}` + `<Loader2 className="animate-spin">` inline in the primary button.

## Body rules

- Internal scroll: cap at `max-h-[85vh]` on the outer wrapper, set `overflow-y-auto` on the body. Don't let the dialog grow past the viewport.
- Don't use `flex-1` on the body if the footer would otherwise sit at viewport bottom on short content — let the body shrink to its natural height.

## State patterns

```ts
// useEffect-based reset (simple cases — Create dialogs that don't have
// derived clone/edit data)
useEffect(() => {
  if (open) form.reset(DEFAULTS);
}, [open, form]);

// Render-time conditional setState (cases with a `key` like cloneId or
// editingId — react-hooks/set-state-in-effect rule forbids the useEffect
// version when the reset depends on a stable key)
const wantedKey = open ? `${editingId ?? "new"}` : "closed";
const [syncKey, setSyncKey] = useState(wantedKey);
if (open && syncKey !== wantedKey) {
  setSyncKey(wantedKey);
  // ... reset other state
}
```

```ts
// Submit handler — toast on success/error, close only after success
const onSubmit = async (values) => {
  try {
    await mutation.mutateAsync(values);
    toast.success("Đã tạo");
    onClose();
  } catch (err) {
    toast.error(extractApiMessage(err) ?? "Tạo thất bại");
  }
};
```

## 2-column dialog (detail with sidebar)

```tsx
<DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden p-0">
  <div className="flex max-h-[85vh] flex-col overflow-hidden">
    <div className="grid grid-cols-1 overflow-y-auto md:grid-cols-[1fr_280px]">
      <div className="p-6">{/* main content */}</div>
      <aside className="hidden border-l bg-muted/30 p-4 md:block">
        {/* metadata sidebar */}
      </aside>
    </div>
    {hasActions && <DialogFooter className="border-t px-6 py-3">{/* ... */}</DialogFooter>}
  </div>
</DialogContent>
```

- Mobile (`< md`): sidebar hidden, main column full width.
- Body scrolls as one unit, footer pinned below.

## Reference components

| Pattern | File |
|---|---|
| Standard create form | `apps/frontend/src/features/employees/components/EmployeeCreateDialog.tsx` |
| 2-step picker → form | `apps/frontend/src/features/requests/components/RequestCreateDialog.tsx` |
| Edit-existing form | `apps/frontend/src/features/requests/components/EditRequestDialog.tsx` |
| Detail with sidebar | `apps/frontend/src/features/calendar/components/EventDetailDialog.tsx` |

## Verify

- No second close button next to the corner X.
- Footer doesn't drift to the viewport bottom on short content.
- DialogTitle is set (radix a11y warning otherwise).
- Reset state when `open` flips to true.
- `pnpm --filter @c-hr/frontend typecheck` clean.
