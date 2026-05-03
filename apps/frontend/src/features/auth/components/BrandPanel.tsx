import { Sparkles } from "lucide-react";

import { SITE } from "@/lib/seo";

const BULLETS = [
  "Auth flow ready out of the box",
  "Type-first with strict TS + zod",
  "Light/dark mode without FOUC",
  "AI-agent docs included",
];

export function BrandPanel() {
  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden border-r border-border bg-muted/30 p-12">
      {/* Layered gradient background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 40% at 15% 20%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 60%), " +
            "radial-gradient(50% 35% at 85% 75%, color-mix(in oklch, var(--primary) 7%, transparent), transparent 60%), " +
            "radial-gradient(40% 30% at 50% 50%, color-mix(in oklch, var(--primary) 5%, transparent), transparent 70%)",
        }}
      />

      {/* Dot grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 0.8px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top: brand + tagline */}
      <div className="animate-fade-up relative z-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            {SITE.name}
          </span>
        </div>
        <p className="max-w-[300px] text-[15px] leading-relaxed text-muted-foreground">
          {SITE.description}
        </p>
      </div>

      {/* Middle: feature bullets */}
      <ul
        className="animate-fade-up relative z-10 space-y-3"
        style={{ animationDelay: "200ms" }}
      >
        {BULLETS.map((bullet) => (
          <li key={bullet} className="flex items-center gap-3 text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg
                viewBox="0 0 16 16"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8.5l3.5 3.5L13 5" />
              </svg>
            </span>
            <span className="text-foreground/80">{bullet}</span>
          </li>
        ))}
      </ul>

      {/* Bottom: footer note */}
      <div
        className="animate-fade-up relative z-10 flex items-center gap-4 text-[11px] text-muted-foreground"
        style={{ animationDelay: "400ms" }}
      >
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Open source · MIT
        </span>
        <span>·</span>
        <span>
          © {new Date().getFullYear()} {SITE.shortName}
        </span>
      </div>
    </div>
  );
}
