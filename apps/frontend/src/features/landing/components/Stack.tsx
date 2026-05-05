import { Badge } from "@/components/ui/badge";

import { MODULES } from "../data/content";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

export function Stack() {
  return (
    <Section
      id="modules"
      eyebrow="Tất cả module"
      title="Một nền tảng — đủ cho cả vòng đời nhân sự"
      description="Mỗi module độc lập về quy trình nhưng chung một nguồn dữ liệu nhân viên. Bật module nào dùng module đó."
    >
      <Reveal>
        <div className="flex flex-wrap justify-center gap-2">
          {MODULES.map((item) => (
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
