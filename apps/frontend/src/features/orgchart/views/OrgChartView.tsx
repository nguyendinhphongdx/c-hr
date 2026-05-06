"use client";

import { GitFork, Network, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DeptTreeTab } from "./DeptTreeTab";
import { OrgFlowTab } from "./OrgFlowTab";
import { ReportingLineTab } from "./ReportingLineTab";

const TABS = ["reporting", "tree", "chart"] as const;
type TabValue = (typeof TABS)[number];

function parseTab(raw: string | null): TabValue {
  return TABS.includes(raw as TabValue) ? (raw as TabValue) : "reporting";
}

export function OrgChartView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = parseTab(searchParams.get("view"));

  const onChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "reporting") params.delete("view");
    else params.set("view", v);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Network className="h-5 w-5" />
          Sơ đồ tổ chức
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nguồn dữ liệu là cây phòng ban (Department.parentId + Department.managerId) — xem ADR 0004. Cấu trúc phòng ban quản lý ở{" "}
          <Link href="/departments" className="underline hover:no-underline">
            /departments
          </Link>
          .
        </p>
      </header>

      <Tabs value={active} onValueChange={onChange}>
        <TabsList>
          <TabsTrigger value="reporting" className="gap-1.5">
            <UsersRound className="h-3.5 w-3.5" /> Cấp báo cáo
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-1.5">
            <GitFork className="h-3.5 w-3.5" /> Cây phòng ban
          </TabsTrigger>
          <TabsTrigger value="chart" className="gap-1.5">
            <Network className="h-3.5 w-3.5" /> Sơ đồ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reporting" className="mt-6">
          <ReportingLineTab />
        </TabsContent>
        <TabsContent value="tree" className="mt-6">
          <DeptTreeTab />
        </TabsContent>
        <TabsContent value="chart" className="mt-6">
          <OrgFlowTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
