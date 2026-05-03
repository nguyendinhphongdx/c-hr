// Single source of truth for site-wide metadata. Edit here, every page picks
// it up automatically through createMetadata() / sitemap / robots / JSON-LD.

export const SITE = {
  name: "Next.js Template",
  shortName: "Template",
  domain: "example.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tagline: "Production-ready Next.js boilerplate",
  description:
    "Next.js boilerplate with shadcn/ui (Radix), Tailwind v4, Zustand, TanStack Query, and a typed auth flow.",
  locale: "en_US",
  twitter: "@example",
  github: "https://github.com/example/example",
  email: "hello@example.com",
  ogImage: "/opengraph-image",
} as const;

export const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#compare", label: "Compare" },
  { href: "#stack", label: "Stack" },
] as const;

export type SiteConfig = typeof SITE;
