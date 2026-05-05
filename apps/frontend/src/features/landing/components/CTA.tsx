import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "./Reveal";

export function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-r from-primary/8 via-indigo-500/8 to-violet-500/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Sẵn sàng vận hành nhân sự bài bản?
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Tạo Org cho doanh nghiệp của bạn trong vài phút. Dùng thử đầy đủ tính năng,
            không yêu cầu thẻ ngân hàng.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl active:scale-[0.98]"
            >
              Bắt đầu miễn phí
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-8 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Đăng nhập
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
