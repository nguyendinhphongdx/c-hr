"use client";

import { PageContainer } from "@/components/layout/PageContainer";

import { Hero } from "../components/Hero";
import { MyTimesheetCard } from "../components/MyTimesheetCard";
import { PendingApprovalsCard } from "../components/PendingApprovalsCard";
import { Shortcuts } from "../components/Shortcuts";
import { StatTiles } from "../components/StatTiles";
import { TodayStatusCard } from "../components/TodayStatusCard";

export function HomeView() {
  return (
    <PageContainer>
      <Hero />

      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <StatTiles />
      </div>

      <div
        className="animate-fade-up grid gap-4 md:grid-cols-2"
        style={{ animationDelay: "120ms" }}
      >
        <TodayStatusCard />
        <PendingApprovalsCard />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
        <MyTimesheetCard />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <Shortcuts />
      </div>
    </PageContainer>
  );
}
