"use client";

import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type CalendarDefaultVisibility, useAuth } from "@/features/auth";

import { CalendarSettingsForm } from "./CalendarSettingsForm";

const CALENDAR_VISIBILITY_KEY = "calendar.visibility";

interface CalendarSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

function normalize(v: unknown): CalendarDefaultVisibility {
  if (v === "PUBLIC" || v === "PRIVATE" || v === "BUSY_ONLY") return v;
  return "PUBLIC";
}

export function CalendarSettingsDialog({
  open,
  onClose,
}: CalendarSettingsDialogProps) {
  const { user, isLoading } = useAuth();
  const stored = user?.preferences?.[CALENDAR_VISIBILITY_KEY];
  const initial = normalize(stored);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cài đặt lịch</DialogTitle>
          <DialogDescription>
            Chia sẻ lịch của bạn và quản lý người bạn theo dõi.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !user ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <CalendarSettingsForm key={user.id} initialVisibility={initial} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
