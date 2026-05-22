import Image from "next/image";

import { cn } from "@/lib/utils";

interface AppLogoProps {
  /** Rendered logo height in px. Width auto-scales by image aspect ratio. */
  height?: number;
  /** Optional extra classes for the wrapping element. */
  className?: string;
  /** Override the default "C-HR" alt text. */
  alt?: string;
  /** Set true to apply `priority` (above-the-fold logos in headers). */
  priority?: boolean;
}

/**
 * Full brand mark (image with company name). Use anywhere there's room
 * for the wordmark. When the host container collapses (e.g. sidebar
 * w-14), switch to <AppLogoMark /> instead — the wordmark is unreadable
 * under ~80px wide.
 *
 * Source: public/images/logo-c-open-ai.png. To swap the asset, replace
 * that file (same name) — every consumer picks up the change.
 */
export function AppLogo({
  height = 28,
  className,
  alt = "C-HR",
  priority,
}: AppLogoProps) {
  // Intrinsic image is ~larger; we constrain by height and let width
  // flow. Using an h/w pair (256 × 76 ≈ 3.37:1) avoids the next/image
  // "missing width or height" warning while preserving aspect ratio.
  return (
    <Image
      src="/images/logo-c-open-ai.png"
      alt={alt}
      width={256}
      height={76}
      priority={priority}
      className={cn("w-auto select-none", className)}
      style={{ height }}
    />
  );
}

interface AppLogoMarkProps {
  /** Square side in px. Defaults to 28 (sidebar-collapsed size). */
  size?: number;
  className?: string;
}

/**
 * Compact monogram for tight spaces (collapsed sidebar, avatars). Shows
 * the letter "C" in a primary-coloured rounded square. Cheap, doesn't
 * need a separate icon-only image asset. Swap to a real square logo
 * later by importing it here.
 */
export function AppLogoMark({ size = 28, className }: AppLogoMarkProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      aria-label="C-HR"
    >
      C
    </div>
  );
}
