---
title: UI tokens & utilities
description: Animation classes, scrollbar utility, design tokens reference.
tags: [reference, ui, animations, design-tokens]
---

# UI tokens & utilities

Defined in [src/app/globals.css](../../../src/app/globals.css).

## Color tokens (CSS variables)

All exposed via Tailwind utilities like `bg-primary`, `text-foreground`, `border-border`, etc.

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |
| `--accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` |
| `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` |
| `--radius` | `0.625rem` | (same) |

To customise, swap a generated palette from [shadcn/themes](https://ui.shadcn.com/themes) into the `:root` and `.dark` blocks.

## Animations

| Class | Keyframes | Duration | Use |
| --- | --- | --- | --- |
| `animate-fade-up` | translate-y(24px) → 0, opacity 0 → 1 | 0.7s ease-out | Section/card reveals |
| `animate-fade-in` | opacity 0 → 1 | 0.6s ease | Subtle text swaps |
| `animate-glow-pulse` | opacity 0.4 ↔ 0.8 | 4s loop | "Live" indicators |
| `animate-float` | translate-y ±6px | 6s loop | Decorative |
| `animate-shake` | translate-x ±6px | 0.45s | Form invalid feedback |
| `animate-border-spin` | conic-gradient `--border-angle` | 2s loop | Animated borders |

## Stagger helpers

Apply to siblings to chain entry animations:

```tsx
<div className="animate-fade-up">First</div>
<div className="animate-fade-up delay-100">Second</div>
<div className="animate-fade-up delay-200">Third</div>
```

Available: `delay-100`, `delay-200`, …, `delay-800`.

## Scroll-triggered (`<Reveal>`)

Use [`<Reveal>`](../../../src/features/landing/components/Reveal.tsx) to animate content **only when scrolled into view** (instead of all at once on page load). It's a thin `IntersectionObserver` wrapper that adds `animate-fade-up` when the element enters the viewport.

```tsx
<Reveal delay={150}>
  <Card>…</Card>
</Reveal>
```

## Reduced motion

All `animate-*` utilities are disabled when the user has `prefers-reduced-motion: reduce` set. No extra work needed — built into `globals.css`.

## Scrollbar utility

```tsx
<div className="overflow-auto scrollbar-thin">…</div>
```

`.scrollbar-thin`:

- Hides the scrollbar until the container is hovered or focus-within
- Uses a 4px translucent thumb (matches dark/light mode)
- Works on Firefox (`scrollbar-width: thin`) and webkit browsers (`::-webkit-scrollbar`)

## Color usage pitfalls

❌ `oklch(var(--primary)/0.10)` — invalid CSS. `--primary` is already an `oklch()` call; you can't nest them.

✅ `bg-primary/10` — Tailwind v4 compiles to `color-mix()` correctly.

✅ `color-mix(in oklch, var(--primary) 10%, transparent)` — explicit version.

If you need an inline gradient stop, use the `color-mix` form. See `Hero.tsx` and `BrandPanel.tsx` for working examples.
