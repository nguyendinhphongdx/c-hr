"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { EventVisibility } from "../types";

const VISIBILITY_OPTIONS: { value: EventVisibility; label: string; help: string }[] = [
  {
    value: "DEFAULT",
    label: "Mặc định",
    help: "Theo cấu hình chia sẻ lịch của bạn",
  },
  {
    value: "PUBLIC",
    label: "Công khai",
    help: "Mọi người trong tổ chức xem được chi tiết",
  },
  {
    value: "PRIVATE",
    label: "Riêng tư",
    help: "Chỉ chủ sở hữu và người được mời thấy chi tiết",
  },
];

interface EventVisibilityFieldProps {
  visibility: EventVisibility;
  onVisibilityChange: (next: EventVisibility) => void;

  isPrivate: boolean;
  onIsPrivateChange: (next: boolean) => void;

  disabled?: boolean;
}

/**
 * Combined visibility + isPrivate override. The schema separates them
 * because `visibility` is the planned default; `isPrivate=true` always
 * overrides it (force private). UI groups them so users see both knobs
 * in one place.
 */
export function EventVisibilityField({
  visibility,
  onVisibilityChange,
  isPrivate,
  onIsPrivateChange,
  disabled,
}: EventVisibilityFieldProps) {
  const helper = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.help;

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label>Chế độ hiển thị</Label>
        <Select
          value={visibility}
          onValueChange={(v) => onVisibilityChange(v as EventVisibility)}
          disabled={disabled}
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

      <Label className="flex cursor-pointer items-start gap-2 text-sm font-normal">
        <Checkbox
          checked={isPrivate}
          onCheckedChange={(v) => onIsPrivateChange(v === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <div>
          <div>Ép buộc riêng tư</div>
          <div className="text-xs text-muted-foreground">
            Bỏ qua chế độ hiển thị — chỉ chủ sở hữu và người được mời thấy chi
            tiết.
          </div>
        </div>
      </Label>
    </div>
  );
}
