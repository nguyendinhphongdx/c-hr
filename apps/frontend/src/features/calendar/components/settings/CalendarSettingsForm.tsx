"use client";

import { Loader2, Trash2, Users, UserPlus, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CalendarDefaultVisibility } from "@/features/auth";
import { EmployeePicker } from "@/features/employees";
import { useUpdatePreference } from "@/features/preferences";
import type { ID } from "@/lib/types";

import {
  useCalendarFollowers,
  useCalendarFollows,
  useCreateCalendarFollow,
  useDeleteCalendarFollow,
} from "../../hooks/useCalendarFollows";
import { userColorFromId } from "../../lib/user-color";
import type { CalendarFollowRow } from "../../services/followService";

const CALENDAR_VISIBILITY_KEY = "calendar.visibility";

const VISIBILITY_OPTIONS: {
  value: CalendarDefaultVisibility;
  label: string;
  help: string;
}[] = [
  {
    value: "PUBLIC",
    label: "Công khai",
    help: "Ai trong Org cũng xem chi tiết.",
  },
  {
    value: "BUSY_ONLY",
    label: "Bận / rảnh",
    help: "Người theo dõi chỉ thấy slot bận, không thấy nội dung.",
  },
  {
    value: "PRIVATE",
    label: "Riêng tư",
    help: "Chỉ người tham dự thấy.",
  },
];

interface PartySummary {
  userId: string | null;
  name: string;
  email: string;
  avatar: string | null;
  code: string | null;
}

function pickFollowed(row: CalendarFollowRow): PartySummary | null {
  const e = row.followed;
  if (!e) return null;
  return {
    userId: e.user?.id ?? null,
    name: e.user?.name ?? "(không tên)",
    email: e.user?.email ?? "—",
    avatar: e.user?.avatar ?? null,
    code: e.code ?? null,
  };
}

function pickFollower(row: CalendarFollowRow): PartySummary | null {
  const e = row.follower;
  if (!e) return null;
  return {
    userId: e.user?.id ?? null,
    name: e.user?.name ?? "(không tên)",
    email: e.user?.email ?? "—",
    avatar: e.user?.avatar ?? null,
    code: e.code ?? null,
  };
}

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
}

interface CalendarSettingsFormProps {
  initialVisibility: CalendarDefaultVisibility;
}

export function CalendarSettingsForm({
  initialVisibility,
}: CalendarSettingsFormProps) {
  const updateSettings = useUpdatePreference();
  const followsQuery = useCalendarFollows();
  const followersQuery = useCalendarFollowers();
  const createFollow = useCreateCalendarFollow();
  const deleteFollow = useDeleteCalendarFollow();

  const [visibility, setVisibility] =
    useState<CalendarDefaultVisibility>(initialVisibility);
  const [pickerEmployeeId, setPickerEmployeeId] = useState<ID | null>(null);

  const helper = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.help;

  const onChangeVisibility = async (next: CalendarDefaultVisibility) => {
    setVisibility(next);
    try {
      await updateSettings.mutateAsync({
        key: CALENDAR_VISIBILITY_KEY,
        value: next,
      });
      toast.success("Đã lưu cài đặt mặc định");
    } catch (err) {
      setVisibility(visibility); // rollback
      toast.error("Không lưu được cài đặt", {
        description:
          err instanceof Error ? err.message : "Vui lòng thử lại sau giây lát.",
      });
    }
  };

  const onAddFollow = async () => {
    if (!pickerEmployeeId) return;
    try {
      await createFollow.mutateAsync({ followedId: pickerEmployeeId });
      toast.success("Đã thêm vào danh sách theo dõi");
      setPickerEmployeeId(null);
    } catch (err) {
      toast.error("Không thêm được", {
        description:
          err instanceof Error ? err.message : "Vui lòng thử lại sau giây lát.",
      });
    }
  };

  const onUnfollow = async (id: ID) => {
    try {
      await deleteFollow.mutateAsync(id);
      toast.success("Đã bỏ theo dõi");
    } catch (err) {
      toast.error("Không bỏ theo dõi được", {
        description:
          err instanceof Error ? err.message : "Vui lòng thử lại sau giây lát.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Section
        icon={<Eye className="h-3.5 w-3.5" />}
        title="Hiển thị mặc định"
        description="Áp dụng khi tạo event mà không chọn riêng. Có thể đổi từng event lúc tạo."
      >
        <div className="grid gap-2 sm:max-w-md">
          <Label className="text-xs text-muted-foreground">
            Cấp độ chia sẻ
          </Label>
          <Select
            value={visibility}
            onValueChange={(v) =>
              onChangeVisibility(v as CalendarDefaultVisibility)
            }
            disabled={updateSettings.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        </div>
      </Section>

      <Section
        icon={<UserPlus className="h-3.5 w-3.5" />}
        title="Đang theo dõi"
        description="Lịch của những người này hiện trên calendar của bạn (theo cấp độ họ đặt)."
        count={followsQuery.data?.length}
      >
        <div className="flex items-stretch gap-2">
          <div className="flex-1">
            <EmployeePicker
              value={pickerEmployeeId}
              onChange={setPickerEmployeeId}
              placeholder="Chọn nhân sự để theo dõi…"
            />
          </div>
          <Button
            type="button"
            onClick={onAddFollow}
            disabled={!pickerEmployeeId || createFollow.isPending}
            className="gap-1.5"
          >
            {createFollow.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Thêm
          </Button>
        </div>

        <PartyList
          rows={followsQuery.data ?? []}
          loading={followsQuery.isLoading}
          empty="Bạn chưa theo dõi ai."
          pick={pickFollowed}
          renderAction={(row) => (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onUnfollow(row.id)}
              disabled={deleteFollow.isPending}
              aria-label="Bỏ theo dõi"
              className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        />
      </Section>

      <Section
        icon={<Users className="h-3.5 w-3.5" />}
        title="Người theo dõi tôi"
        description="Những người đang xem lịch của bạn. Nội dung họ thấy phụ thuộc vào cấp độ chia sẻ của từng event."
        count={followersQuery.data?.length}
      >
        <PartyList
          rows={followersQuery.data ?? []}
          loading={followersQuery.isLoading}
          empty="Chưa có ai theo dõi bạn."
          pick={pickFollower}
        />
      </Section>
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  count?: number;
  children: React.ReactNode;
}

function Section({ icon, title, description, count, children }: SectionProps) {
  return (
    <section className="space-y-2.5">
      <header className="flex items-baseline gap-2">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground">
          {icon}
        </span>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {typeof count === "number" && count > 0 && (
          <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </header>
      {description && (
        <p className="-mt-1.5 pl-7 text-xs text-muted-foreground">
          {description}
        </p>
      )}
      <div className="space-y-2 pl-7">{children}</div>
    </section>
  );
}

interface PartyListProps {
  rows: CalendarFollowRow[];
  loading: boolean;
  empty: string;
  pick: (row: CalendarFollowRow) => PartySummary | null;
  renderAction?: (row: CalendarFollowRow) => React.ReactNode;
}

function PartyList({ rows, loading, empty, pick, renderAction }: PartyListProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải…
      </div>
    );
  }
  if (!rows.length) {
    return (
      <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2.5 text-center text-xs text-muted-foreground">
        {empty}
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-md border">
      {rows.map((row) => {
        const e = pick(row);
        if (!e) return null;
        return (
          <li
            key={row.id}
            className="group flex items-center gap-2.5 px-2.5 py-1.5"
          >
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-sm"
              style={{
                backgroundColor: e.userId
                  ? userColorFromId(e.userId)
                  : undefined,
              }}
            />
            <Avatar size="sm">
              {e.avatar && <AvatarImage src={e.avatar} alt={e.name} />}
              <AvatarFallback>{initials(e.name, e.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-tight">
                {e.name}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {e.email}
                {e.code ? ` · ${e.code}` : ""}
              </div>
            </div>
            {renderAction?.(row)}
          </li>
        );
      })}
    </ul>
  );
}
