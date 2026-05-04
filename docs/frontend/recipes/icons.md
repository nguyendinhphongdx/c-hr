---
title: Icons
description: When to use lucide-react vs custom inline SVG vs an icon library, and how to add a new icon.
tags: [recipe, icons, ui, svg]
---

# Icons

## TL;DR

| Need | Use |
| --- | --- |
| UI icon (arrow, check, eye, settings, …) | `lucide-react` (already installed) |
| Brand mark (GitHub, Google, X, Discord, Apple, …) | Add a file in [`src/components/icons/`](../../../apps/frontend/src/components/icons/) |
| 15+ brand marks at once | Install `simple-icons` (see "Scaling up") |

## Why a dedicated icons folder

`lucide-react@1.x` (current) doesn't ship every brand icon — `Github` and `Google` aren't exported. Inline SVGs in [`src/components/icons/`](../../../apps/frontend/src/components/icons/) avoid breakage on lucide upgrades and stay zero-dep.

## Layout

```text
src/components/icons/
├── index.ts             # re-exports all icons + IconProps type
├── types.ts             # shared `IconProps`
├── github-icon.tsx      # one file = one icon
├── google-icon.tsx
└── …
```

Each icon is a one-component file. Tree-shaking works because each file is its own module — only the imported icons land in the bundle.

## Add a new brand icon

1. **Find the SVG.** [simpleicons.org](https://simpleicons.org/) is the canonical source — search the brand, click "Copy SVG", grab the `<path>` data.

2. **Create `<name>-icon.tsx`** under `src/components/icons/`:

   ```tsx
   // src/components/icons/discord-icon.tsx
   import type { IconProps } from "./types";

   export function DiscordIcon({ className, title }: IconProps) {
     return (
       <svg
         viewBox="0 0 24 24"
         className={className}
         fill="currentColor"
         aria-hidden={!title}
         role={title ? "img" : undefined}
       >
         {title && <title>{title}</title>}
         <path d="…paste-the-d-attribute-here…" />
       </svg>
     );
   }
   ```

3. **Re-export from [`index.ts`](../../../apps/frontend/src/components/icons/index.ts):**

   ```ts
   export { DiscordIcon } from "./discord-icon";
   ```

4. **Use it:**

   ```tsx
   import { DiscordIcon } from "@/components/icons";

   <DiscordIcon className="h-4 w-4 text-muted-foreground" />
   ```

## Conventions

- **Naming**: kebab-case file (`discord-icon.tsx`), PascalCase export (`DiscordIcon`).
- **Sizing**: never hardcode `width`/`height` on the `<svg>` — let consumers size with `h-* w-*` Tailwind utilities.
- **Color**: use `fill="currentColor"` (or `stroke="currentColor"`) so the icon picks up `text-*` classes. Multi-color brand SVGs (Google) can keep their hardcoded colors.
- **Accessibility**: accept a `title` prop. When provided, render a `<title>` and set `role="img"`; otherwise `aria-hidden`.
- **viewBox**: keep the source viewBox (usually `0 0 24 24`). Don't trim.

## Don'ts

- ❌ Inline SVG inside a feature/page component. Extract to `src/components/icons/`.
- ❌ Single mega-file with all icons. Per-file = better tree-shaking + simpler diffs.
- ❌ Editing files in `src/components/ui/` to add icon variants — those are shadcn primitives.
- ❌ Hardcoded `width="16" height="16"` on the SVG.

## Scaling up — adding `simple-icons`

If you need 15+ brand marks, manually maintaining files gets old. Install `simple-icons`:

```bash
pnpm add simple-icons
```

The package ships raw SVG paths for ~3000 brands — no React components, just metadata. Wrap them generically:

```tsx
// src/components/icons/from-simple-icons.tsx
import type { IconProps } from "./types";

interface SiBrand {
  title: string;
  hex: string;
  path: string;
}

interface BrandIconProps extends IconProps {
  brand: SiBrand;
  /** Use the brand's official color instead of currentColor. */
  brandColor?: boolean;
}

export function BrandIcon({ brand, brandColor, className, title }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={brandColor ? `#${brand.hex}` : "currentColor"}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <path d={brand.path} />
    </svg>
  );
}
```

Use it:

```tsx
import { siGithub } from "simple-icons/icons/siGithub";
import { BrandIcon } from "@/components/icons/from-simple-icons";

<BrandIcon brand={siGithub} className="h-4 w-4" />
<BrandIcon brand={siGithub} className="h-4 w-4" brandColor />
```

Trade-off: each `import { siX } from "simple-icons/icons/siX"` is a separate module — bundler tree-shakes correctly, but you do pay one network/parse hit per icon. For a handful, the inline file approach (default) is simpler.

## Other libraries (for reference)

| Library | When to consider |
| --- | --- |
| [@iconify/react](https://iconify.design/docs/icon-components/react/) | You need 200k+ icons across many sets, lazy-loaded |
| [react-icons](https://react-icons.github.io/react-icons/) | Aggregator (FA, MD, SI, Bootstrap, …); large bundle but tree-shakeable |
| [Heroicons](https://heroicons.com/) | Tailwind's first-party UI icon set, similar to lucide |
| [Tabler Icons](https://tabler.io/icons) | 4500+ icons, lucide-style, larger set |

For most projects: **lucide-react + `src/components/icons/` for brand marks** is the sweet spot. Don't reach for `@iconify` unless you genuinely need icons from many sets.
