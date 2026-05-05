import { HOW_IT_WORKS } from "../data/content";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

export function HowItWorks() {
  return (
    <Section
      id="how"
      eyebrow="Ba bước"
      title="Từ đăng ký đến vận hành"
      description="Không phải dự án triển khai sáu tháng. Khởi động trong tuần đầu, nâng dần từng module."
    >
      <div className="relative grid gap-6 md:grid-cols-3">
        {/* Connector line — desktop only */}
        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-9 hidden h-px bg-linear-to-r from-transparent via-border to-transparent md:block" />

        {HOW_IT_WORKS.map((step, i) => (
          <Reveal key={step.number} delay={i * 100}>
            <div className="relative flex flex-col items-center text-center md:items-start md:text-left">
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background font-mono text-sm font-bold text-primary shadow-sm">
                {step.number}
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
