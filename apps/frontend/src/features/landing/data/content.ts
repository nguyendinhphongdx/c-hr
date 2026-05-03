import {
  Boxes,
  Code2,
  Layers,
  PaintBucket,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface StackItem {
  name: string;
  tag: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface Step {
  number: string;
  title: string;
  description: string;
}

export interface ComparisonRow {
  label: string;
  ours: string;
  diy: string;
}

export const HERO_STATS: Stat[] = [
  { value: "0 → ship", label: "in one command" },
  { value: "<1m", label: "to first run" },
  { value: "100%", label: "in your repo" },
  { value: "MIT", label: "open source" },
];

export const FEATURES: Feature[] = [
  {
    id: "stack",
    icon: Layers,
    title: "Modern stack",
    description:
      "Next.js 16 (App Router), React 19, Tailwind 4, and TypeScript 5 on current defaults.",
  },
  {
    id: "ui",
    icon: PaintBucket,
    title: "shadcn/ui (Radix Nova)",
    description:
      "Every component is in your repo, themeable via CSS variables, and accessible by default.",
  },
  {
    id: "data",
    icon: Boxes,
    title: "Server + client state",
    description:
      "TanStack Query for server cache and Zustand for client state without Context boilerplate.",
  },
  {
    id: "auth",
    icon: ShieldCheck,
    title: "Auth flow ready",
    description:
      "Login, register, forgot/reset password, OTP, and verify email wired to a typed axios client.",
  },
  {
    id: "perf",
    icon: Zap,
    title: "Edge-ready",
    description:
      "Middleware-based auth gate. RSC-first layouts. No client-flicker on protected routes.",
  },
  {
    id: "dx",
    icon: Code2,
    title: "Type-first",
    description:
      "Strict TS, conventions for shared, feature, and API types, plus runtime validation with zod.",
  },
];

export const HOW_IT_WORKS: Step[] = [
  {
    number: "01",
    title: "Use the template",
    description:
      "One click on GitHub, or `npx degit <owner>/<repo> my-app`. No forks, no shared history.",
  },
  {
    number: "02",
    title: "Run init",
    description:
      "`pnpm install && pnpm run init:project` renames the package, writes `.env`, and either reuses or creates a fresh git repo.",
  },
  {
    number: "03",
    title: "Add your features",
    description:
      "Drop a folder under `src/features/`. The Auth feature is a fully working reference — copy its shape and ship.",
  },
];

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: "Auth flow",
    ours: "Login, register, forgot/reset, OTP, verify-email — typed",
    diy: "Wire it yourself, hope you got CSRF right",
  },
  {
    label: "Server state",
    ours: "TanStack Query with refresh-token interceptor",
    diy: "Roll your own fetch hooks",
  },
  {
    label: "Theming",
    ours: "Light/dark with `next-themes`, no FOUC",
    diy: "Mostly works, until SSR",
  },
  {
    label: "App Router conventions",
    ours: "`error.tsx`, `loading.tsx`, `not-found.tsx`, middleware all wired",
    diy: "Add as you remember they exist",
  },
  {
    label: "AI-agent docs",
    ours: "`CLAUDE.md` + MCP server expose docs to Claude Code et al.",
    diy: "Hope the agent guesses your conventions",
  },
];

export const STACK: StackItem[] = [
  { name: "Next.js", tag: "16" },
  { name: "React", tag: "19" },
  { name: "Tailwind CSS", tag: "4" },
  { name: "shadcn/ui", tag: "Radix Nova" },
  { name: "TanStack Query", tag: "5" },
  { name: "Zustand", tag: "5" },
  { name: "react-hook-form", tag: "7" },
  { name: "zod", tag: "4" },
  { name: "axios", tag: "1" },
  { name: "next-themes", tag: "0.4" },
  { name: "sonner", tag: "2" },
  { name: "lucide-react", tag: "icons" },
];
