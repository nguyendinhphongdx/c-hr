import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

import type { Tag } from "../types";

interface TagBadgeProps {
  tag: Pick<Tag, "name" | "color">;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASS = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
} as const;

/**
 * Compact tag chip. Background is a translucent mix of the tag color and
 * the page background so the chip stays readable on both themes; the
 * border carries the saturated color so the tag identity is visible even
 * with the muted fill.
 */
export function TagBadge({ tag, size = "md", className }: TagBadgeProps) {
  const style: CSSProperties = {
    backgroundColor: `color-mix(in oklab, ${tag.color} 22%, var(--background))`,
    borderColor: tag.color,
    color: tag.color,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium leading-none",
        SIZE_CLASS[size],
        className,
      )}
      style={style}
    >
      {tag.name}
    </span>
  );
}
