"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useIsAdmin, useIsAppAdmin } from "@/features/auth";

/**
 * Hop the user to the first admin page they're allowed into. We can't
 * decide this on the server because the role lookup is hydrated client-
 * side via `useAuth`. Renders nothing — auth state arrives within ms.
 */
export default function AdminIndexPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isHrmAdmin = useIsAppAdmin("HRM");

  useEffect(() => {
    if (isAdmin) router.replace("/admin/organization");
    else if (isHrmAdmin) router.replace("/admin/work-schedule");
    else router.replace("/home");
  }, [isAdmin, isHrmAdmin, router]);

  return null;
}
