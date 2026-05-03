import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FEATURES } from "../data/content";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

export function Features() {
  return (
    <Section
      id="features"
      muted
      eyebrow="Batteries included"
      title="Everything wired, nothing magic"
      description="Each piece is a small, replaceable file in your repo. Read it, edit it, throw it out. No framework lock-in, no hidden runtime."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.id} delay={i * 60}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <CardTitle>{f.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {f.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
