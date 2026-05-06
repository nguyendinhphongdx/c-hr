"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { ID } from "@/lib/types";

import { RequestCreateDialog } from "../components/RequestCreateDialog";

/**
 * Thin URL-friendly wrapper around `RequestCreateDialog`. Reading
 * `?clone=<id>` lets the timesheet/preview keep deep-linking via URL even
 * though the primary entry is now a dialog inside the list view.
 */
export function RequestCreateView() {
  const router = useRouter();
  const search = useSearchParams();
  const cloneId = search.get("clone");

  return (
    <RequestCreateDialog
      open
      onClose={() => router.push("/requests")}
      cloneFromId={cloneId ? (cloneId as ID) : undefined}
    />
  );
}
