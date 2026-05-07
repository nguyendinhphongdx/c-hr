"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CalendarDefaultVisibility,
  useAuth,
  useUpdateCalendarSettings,
} from "@/features/auth";
import {
  type CalendarFollowRow,
  useCalendarFollowers,
  useCalendarFollows,
  useCreateCalendarFollow,
  useDeleteCalendarFollow,
} from "@/features/calendar";
import { EmployeePicker } from "@/features/employees";
import type { ID } from "@/lib/types";

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
    label: "Bận/rảnh",
    help: "Người theo dõi chỉ thấy slot bận, không thấy nội dung.",
  },
  {
    value: "PRIVATE",
    label: "Riêng tư",
    help: "Chỉ người tham dự thấy.",
  },
];

function initials(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
}

interface FollowedRowSummary {
  id: ID;
  name: string;
  email: string;
  avatar: string | null;
  code: string | null;
}

function pickFollowed(row: CalendarFollowRow): FollowedRowSummary | null {
  const e = row.followed;
  if (!e) return null;
  return {
    id: e.id,
    name: e.user?.name ?? "(không tên)",
    email: e.user?.email ?? "—",
    avatar: e.user?.avatar ?? null,
    code: e.code ?? null,
  };
}

function pickFollower(row: CalendarFollowRow): FollowedRowSummary | null {
  const e = row.follower;
  if (!e) return null;
  return {
    id: e.id,
    name: e.user?.name ?? "(không tên)",
    email: e.user?.email ?? "—",
    avatar: e.user?.avatar ?? null,
    code: e.code ?? null,
  };
}

function normalizeVisibility(
  v: CalendarDefaultVisibility | undefined,
): CalendarDefaultVisibility {
  if (!v || v === "DEFAULT") return "PUBLIC";
  return v;
}

export function CalendarSettingsView() {
  const { user, isLoading } = useAuth();
  if (isLoading || !user) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }
  return (
    <CalendarSettingsForm
      key={user.id}
      initialVisibility={normalizeVisibility(user.calendarDefaultVisibility)}
    />
  );
}

interface CalendarSettingsFormProps {
  initialVisibility: CalendarDefaultVisibility;
}

function CalendarSettingsForm({ initialVisibility }: CalendarSettingsFormProps) {
  const updateSettings = useUpdateCalendarSettings();

  const followsQuery = useCalendarFollows();
  const followersQuery = useCalendarFollowers();
  const createFollow = useCreateCalendarFollow();
  const deleteFollow = useDeleteCalendarFollow();

  const [visibility, setVisibility] =
    useState<CalendarDefaultVisibility>(initialVisibility);
  const [savedVisibility, setSavedVisibility] =
    useState<CalendarDefaultVisibility>(initialVisibility);
  const [pickerEmployeeId, setPickerEmployeeId] = useState<ID | null>(null);

  const dirty = visibility !== savedVisibility;
  const helper = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.help;

  const onSaveVisibility = async () => {
    try {
      await updateSettings.mutateAsync({ calendarDefaultVisibility: visibility });
      setSavedVisibility(visibility);
      toast.success("Đã lưu cài đặt mặc định");
    } catch (err) {
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
      <Card>
        <CardHeader>
          <CardTitle>Mặc định cho event mới</CardTitle>
          <CardDescription>
            Chế độ hiển thị áp dụng khi bạn tạo sự kiện mà không chọn
            riêng. Có thể đổi từng event lúc tạo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:max-w-md">
            <Label>Chế độ hiển thị mặc định</Label>
            <Select
              value={visibility}
              onValueChange={(v) =>
                setVisibility(v as CalendarDefaultVisibility)
              }
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
            {helper && (
              <p className="text-xs text-muted-foreground">{helper}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            type="button"
            className="gap-2"
            onClick={onSaveVisibility}
            disabled={!dirty || updateSettings.isPending}
          >
            {updateSettings.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Lưu
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đang theo dõi</CardTitle>
          <CardDescription>
            Lịch của những người này sẽ hiển thị trên calendar của bạn (theo
            đúng cấp độ chia sẻ họ đặt).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="mb-1 block">Thêm người theo dõi</Label>
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
              className="gap-2"
            >
              {createFollow.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Thêm
            </Button>
          </div>

          {followsQuery.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
            </div>
          ) : !followsQuery.data?.length ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Bạn chưa theo dõi ai.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {followsQuery.data.map((row) => {
                const e = pickFollowed(row);
                if (!e) return null;
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Avatar size="sm">
                      {e.avatar && (
                        <AvatarImage src={e.avatar} alt={e.name} />
                      )}
                      <AvatarFallback>
                        {initials(e.name, e.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {e.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {e.email}
                        {e.code ? ` · ${e.code}` : ""}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onUnfollow(row.id)}
                      disabled={deleteFollow.isPending}
                      aria-label="Bỏ theo dõi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Người theo dõi tôi</CardTitle>
          <CardDescription>
            Những người đang xem lịch của bạn. Nội dung họ thấy phụ thuộc vào
            chế độ hiển thị bạn đặt cho từng event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {followersQuery.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
            </div>
          ) : !followersQuery.data?.length ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Chưa có ai theo dõi bạn.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {followersQuery.data.map((row) => {
                const e = pickFollower(row);
                if (!e) return null;
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Avatar size="sm">
                      {e.avatar && (
                        <AvatarImage src={e.avatar} alt={e.name} />
                      )}
                      <AvatarFallback>
                        {initials(e.name, e.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {e.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {e.email}
                        {e.code ? ` · ${e.code}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
