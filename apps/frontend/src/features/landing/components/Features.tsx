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
      eyebrow="Đầy đủ tính năng"
      title="Mọi thứ HR cần, trên cùng một hệ thống"
      description="Sáu module cốt lõi nói chung một ngôn ngữ dữ liệu — đổi cây phòng ban một lần, OrgChart, đơn từ và bảng lương đều thấy. Không vá tay giữa các sheet."
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
