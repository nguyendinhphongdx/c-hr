"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { ID } from "@/lib/types";

import { RequestCreateDialog } from "../components/RequestCreateDialog";

/**
 * Thin URL-friendly wrapper around `RequestCreateDialog`. Supports two
 * deep-link modes via query params:
 *   - `?clone=<id>` — clone existing request
 *   - `?groupCode=<code>&date=<YYYY-MM-DD>` — pre-pick group + seed date
 *     (used by timesheet "Tạo đơn" actions for LATE/EARLY_LEAVE/ABSENT days)
 */
export function RequestCreateView() {
  const router = useRouter();
  const search = useSearchParams();
  const cloneId = search.get("clone");
  const groupCode = search.get("groupCode");
  const date = search.get("date");
  const prefill =
    !cloneId && (groupCode || date)
      ? { groupCode: groupCode ?? undefined, date: date ?? undefined }
      : undefined;

  return (
    <RequestCreateDialog
      open
      onClose={() => router.push("/requests")}
      cloneFromId={cloneId ? (cloneId as ID) : undefined}
      prefill={prefill}
    />
  );
}
