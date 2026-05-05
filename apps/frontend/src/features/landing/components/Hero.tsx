import Link from "next/link";
import { ArrowRight, ChevronRight, Fingerprint } from "lucide-react";

import { HERO_STATS } from "../data/content";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <BackgroundGlow />

      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur">
            <Fingerprint className="h-3.5 w-3.5 text-primary" />
            <span>Mới · Tích hợp máy chấm công ZKTeco / Hikvision</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </span>

          <h1
            className="animate-fade-up mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl"
            style={{ animationDelay: "100ms" }}
          >
            Vận hành nhân sự,{" "}
            <span className="bg-linear-to-r from-primary via-indigo-500 to-violet-500 bg-clip-text text-transparent">
              gọn trong một nền tảng.
            </span>
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
            style={{ animationDelay: "200ms" }}
          >
            C-HR là phần mềm HRM cho doanh nghiệp Việt: hồ sơ nhân viên, phòng ban,
            chấm công thời gian thực, đơn từ và bảng lương — tất cả trong cùng một
            nơi.
          </p>

          <div
            className="animate-fade-up mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
            style={{ animationDelay: "300ms" }}
          >
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
            >
              Dùng thử miễn phí
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-7 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
            >
              Đăng nhập
            </Link>
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

        <AppPreview />
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

const PREVIEW_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

const PREVIEW_ROWS: ReadonlyArray<{
  name: string;
  dept: string;
  cells: ReadonlyArray<"on" | "late" | "off" | "absent" | "early">;
}> = [
  {
    name: "Nguyễn Thu Hà",
    dept: "Kế toán",
    cells: ["on", "on", "on", "late", "on", "off", "off"],
  },
  {
    name: "Trần Quốc Anh",
    dept: "Kỹ thuật",
    cells: ["on", "late", "on", "on", "early", "off", "off"],
  },
  {
    name: "Lê Minh Châu",
    dept: "Nhân sự",
    cells: ["on", "on", "absent", "on", "on", "off", "off"],
  },
  {
    name: "Phạm Hoàng Long",
    dept: "Kinh doanh",
    cells: ["on", "on", "on", "on", "on", "off", "off"],
  },
];

function AppPreview() {
  return (
    <div
      className="animate-fade-up mx-auto mt-16 max-w-4xl"
      style={{ animationDelay: "500ms" }}
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-foreground/5">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 truncate text-[11px] text-muted-foreground">
            c-hr.vn / bảng-giờ-làm
          </span>
        </div>

        <div className="px-5 py-5 md:px-7 md:py-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-left">
              <div className="text-sm font-semibold text-foreground">
                Bảng giờ làm — Tháng 11/2026
              </div>
              <div className="text-xs text-muted-foreground">
                Phòng ban: Tất cả · Cập nhật vừa xong
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <Legend color="bg-emerald-500" label="Đúng giờ" />
              <Legend color="bg-amber-500" label="Trễ" />
              <Legend color="bg-violet-500" label="Về sớm" />
              <Legend color="bg-rose-500" label="Vắng" />
              <Legend color="bg-muted-foreground/30" label="Off" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Nhân viên</th>
                  {PREVIEW_DAYS.map((d) => (
                    <th key={d} className="py-2 px-1.5 text-center font-medium">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PREVIEW_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-3">
                      <div className="text-sm font-medium text-foreground">
                        {row.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {row.dept}
                      </div>
                    </td>
                    {row.cells.map((c, i) => (
                      <td key={i} className="px-1 py-3 text-center">
                        <StatusDot status={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

const STATUS_COLOR: Record<
  "on" | "late" | "off" | "absent" | "early",
  string
> = {
  on: "bg-emerald-500",
  late: "bg-amber-500",
  early: "bg-violet-500",
  absent: "bg-rose-500",
  off: "bg-muted-foreground/30",
};

function StatusDot({
  status,
}: {
  status: "on" | "late" | "off" | "absent" | "early";
}) {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted/40">
      <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[status]}`} />
    </span>
  );
}
