import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import type { UserSummary } from "../../types";

interface TaskAssigneeAvatarProps {
  user: UserSummary | null | undefined;
  size?: "sm" | "default";
  className?: string;
}

function initials(name: string | null, email: string): string {
  const src = name?.trim() || email;
  const parts = src.split(/\s+|@/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

export function TaskAssigneeAvatar({
  user,
  size = "sm",
  className,
}: TaskAssigneeAvatarProps) {
  if (!user) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-dashed text-[10px] text-muted-foreground",
          size === "sm" ? "h-6 w-6" : "h-7 w-7",
          className,
        )}
        title="Chưa giao"
      >
        ?
      </span>
    );
  }
  const label = user.name ?? user.email;
  return (
    <span title={label} className="inline-block">
      <Avatar size={size} className={className}>
        <AvatarImage src={user.avatar ?? undefined} alt={label} />
        <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
      </Avatar>
    </span>
  );
}
