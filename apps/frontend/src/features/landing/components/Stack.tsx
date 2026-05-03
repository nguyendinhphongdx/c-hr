import { Badge } from "@/components/ui/badge";

import { STACK } from "../data/content";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

export function Stack() {
  return (
    <Section
      id="stack"
      eyebrow="The whole list"
      title="Modern, current, vendor-neutral"
      description="Latest stable versions across the board. No patched forks, no mystery monorepo."
    >
      <Reveal>
        <div className="flex flex-wrap justify-center gap-2">
          {STACK.map((item) => (
            <Badge
              key={item.name}
              variant="outline"
              className="gap-2 border-border/60 bg-background/60 px-3 py-1.5 backdrop-blur"
            >
              <span className="font-medium text-foreground">{item.name}</span>
              <span className="text-muted-foreground">{item.tag}</span>
            </Badge>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
