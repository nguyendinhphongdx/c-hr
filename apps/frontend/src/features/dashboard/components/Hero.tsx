"use client";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth";

const HOURS = new Date().getHours();
const greeting = HOURS < 11 ? "Chào buổi sáng" : HOURS < 18 ? "Chào buổi chiều" : "Chào buổi tối";

export function Hero() {
  const { user, organization } = useAuth();
  const firstName = user?.name?.split(" ").pop() ?? null;

  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-linear-to-br from-primary/5 via-background to-background p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-3">
            {greeting}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {firstName ? `Xin chào, ${firstName}` : "Xin chào"}
            <span className="text-muted-foreground">.</span>
          </h1>
          {organization && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {organization.name} —{" "}
              <span className="text-foreground">
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
