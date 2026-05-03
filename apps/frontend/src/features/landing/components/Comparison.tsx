import { Check, X } from "lucide-react";

import { COMPARISON_ROWS } from "../data/content";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

export function Comparison() {
  return (
    <Section
      id="compare"
      muted
      eyebrow="What you skip"
      title="vs. starting from `create-next-app`"
      description="`create-next-app` is great. This template starts where it leaves off."
    >
      <Reveal>
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <div className="grid grid-cols-1 border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid-cols-3">
            <div className="px-6 py-4">Concern</div>
            <div className="border-t border-border px-6 py-4 text-emerald-600 md:border-t-0 md:border-l">
              This template
            </div>
            <div className="border-t border-border px-6 py-4 md:border-t-0 md:border-l">
              Roll your own
            </div>
          </div>

          {COMPARISON_ROWS.map((row, i) => (
            <div
              key={row.label}
              className={
                i % 2 === 0
                  ? "grid grid-cols-1 md:grid-cols-3"
                  : "grid grid-cols-1 bg-muted/20 md:grid-cols-3"
              }
            >
              <div className="px-6 py-4 text-sm font-medium">{row.label}</div>
              <div className="flex items-start gap-2 border-t border-border px-6 py-4 text-sm text-foreground/90 md:border-t-0 md:border-l">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{row.ours}</span>
              </div>
              <div className="flex items-start gap-2 border-t border-border px-6 py-4 text-sm text-muted-foreground md:border-t-0 md:border-l">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                <span>{row.diy}</span>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
