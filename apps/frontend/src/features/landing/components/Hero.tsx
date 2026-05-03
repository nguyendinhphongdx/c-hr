import Link from "next/link";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";

import { SITE } from "@/lib/seo";
import { HERO_STATS } from "../data/content";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <BackgroundGlow />

      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur transition-colors hover:bg-background"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Open source · MIT</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </a>

          <h1
            className="animate-fade-up mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl"
            style={{ animationDelay: "100ms" }}
          >
            Skip the setup.{" "}
            <span className="bg-linear-to-r from-primary via-indigo-500 to-violet-500 bg-clip-text text-transparent">
              Ship the product.
            </span>
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
            style={{ animationDelay: "200ms" }}
          >
            A production-ready Next.js 16 template — auth, theming, forms,
            typed data layer, and AI-agent docs already wired. Clone, install,
            ship.
          </p>

          <div
            className="animate-fade-up mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
            style={{ animationDelay: "300ms" }}
          >
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={SITE.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-7 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
            >
              View on GitHub
            </a>
          </div>

          <div
            className="animate-fade-up mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4"
            style={{ animationDelay: "400ms" }}
          >
            {HERO_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {s.value}
                </div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <CommandPreview />
      </div>
    </section>
  );
}

function BackgroundGlow() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-linear-to-b from-primary/12 via-indigo-500/8 to-transparent blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute left-0 top-40 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </>
  );
}

/**
 * Visual cue showing how fast bootstrap is. A static "terminal preview" —
 * communicates the value in one glance without a video or animation loop.
 */
function CommandPreview() {
  return (
    <div
      className="animate-fade-up mx-auto mt-16 max-w-3xl"
      style={{ animationDelay: "500ms" }}
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-foreground/5">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-[11px] text-muted-foreground">
            ~/code · zsh
          </span>
        </div>
        <pre className="overflow-x-auto px-5 py-5 text-left font-mono text-[13px] leading-relaxed">
          <code>
            <span className="text-muted-foreground"># Use the GitHub template</span>
            {"\n"}
            <span className="text-emerald-500">$</span>{" "}
            <span className="text-foreground">npx degit </span>
            <span className="text-primary">{`<owner>/`}{SITE.shortName.toLowerCase()}</span>
            {" my-app"}
            {"\n\n"}
            <span className="text-emerald-500">$</span>{" "}
            <span className="text-foreground">cd my-app && pnpm install</span>
            {"\n"}
            <span className="text-emerald-500">$</span>{" "}
            <span className="text-foreground">pnpm run init:project</span>
            {"\n"}
            <span className="text-emerald-500">$</span>{" "}
            <span className="text-foreground">pnpm dev</span>
            {"\n\n"}
            <span className="text-muted-foreground">
              ▲ Ready on http://localhost:3000
            </span>
          </code>
        </pre>
      </div>
    </div>
  );
}
