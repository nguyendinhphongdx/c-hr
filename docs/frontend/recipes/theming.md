---
title: Theming & design tokens
description: How CSS variables, dark mode, animations, and the shadcn registry hang together.
tags: [recipe, theme, tailwind, css-variables, animations]
---

# Theming & design tokens

## Single source of truth

All design tokens live in [src/app/globals.css](../../../apps/frontend/src/app/globals.css):

```text
:root         { --primary, --background, --border, ... }   /* light mode */
.dark         { same tokens, dark values }
@theme inline { maps tokens → tailwind --color-* utilities }
```

The shadcn baseColor is **`neutral`**, the style is **`radix-nova`**. To change the look:

1. **Pick a palette**: visit [https://ui.shadcn.com/themes](https://ui.shadcn.com/themes) → choose colors → copy the `:root { ... }` and `.dark { ... }` blocks.
2. **Paste into `globals.css`** replacing the existing blocks.
3. Don't touch `@theme inline` unless you're adding a brand-new token.

## Dark mode

Wired via [`next-themes`](https://github.com/pacocoursey/next-themes) in `src/components/providers/ThemeProvider.tsx`:

- `attribute="class"` — adds `class="dark"` to `<html>` instead of inline styles (works with Tailwind `dark:` variants)
- `defaultTheme="system"` — respect OS preference
- `enableSystem` — re-react to OS changes
- `disableTransitionOnChange` — prevents color flicker during theme switch

`<ThemeToggle>` (in `src/components/layout/ThemeToggle.tsx`) only flips light/dark. To expose system mode, swap the button for a `<DropdownMenu>` with three options.

## Tailwind v4 specifics

- `bg-linear-to-br` (not `bg-gradient-to-br`) — Tailwind v4 renamed this.
- `bg-primary/10` etc. compile via `color-mix(in oklch, ...)`. Use the utility, don't hand-write `oklch(var(--primary)/0.1)` — that **breaks** because `--primary` is already an `oklch()` call (nesting isn't valid CSS).

If you DO need a programmatic alpha, use `color-mix`:

```css
background: color-mix(in oklch, var(--primary) 10%, transparent);
```

See the Hero / BrandPanel for inline examples.

## Animations

Custom keyframes are in `globals.css`:

| Utility | When to use |
| --- | --- |
| `animate-fade-up` | First-paint hero/section reveals |
| `animate-fade-in` | Subtle text or pill swaps |
| `animate-glow-pulse` | Indicators (live, recording, busy) |
| `animate-float` | Decorative floating elements |
| `animate-shake` | Form invalidation feedback |
| `animate-border-spin` | Conic-gradient borders |

Stagger via `delay-100`, `delay-200`, … `delay-800` on siblings.

For **scroll-triggered** entry animations (only when in viewport), use `<Reveal>` from `src/features/landing/components/Reveal.tsx`:

```tsx
<Reveal delay={200}>
  <Card>…</Card>
</Reveal>
```

`@media (prefers-reduced-motion: reduce)` disables all of them automatically.

## Scrollbars

`.scrollbar-thin` (in `globals.css`) hides the scrollbar until hover/focus, then shows a minimal track. Already applied on the dashboard `<main>` — apply elsewhere as needed:

```tsx
<div className="overflow-auto scrollbar-thin">…</div>
```

## Adding a new shadcn component

```bash
pnpm dlx shadcn@latest add <name>
```

This writes a fresh file under `src/components/ui/`. Don't edit the file by hand afterwards — re-run the command if you need an update.

To browse what's available: `pnpm dlx shadcn@latest add` (no name) opens an interactive picker.

## Brand colors

If your brand uses a non-neutral primary, override **only** `--primary` and `--primary-foreground` in `:root` and `.dark`:

```css
:root {
  --primary: oklch(0.55 0.20 264);          /* indigo-ish */
  --primary-foreground: oklch(0.985 0 0);
}
.dark {
  --primary: oklch(0.65 0.20 264);
  --primary-foreground: oklch(0.145 0 0);
}
```

Everything that uses `bg-primary`, `text-primary`, `border-primary` picks it up automatically. Don't litter the codebase with hardcoded color classes — keep the system tokens-driven.
