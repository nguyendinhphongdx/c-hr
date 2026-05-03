"use client";

import { useSearchParams } from "next/navigation";

import { VerifyOtpView } from "@/features/auth";

/**
 * Pulls the optional `?to=` query (email or phone, masked by the BE) and
 * passes it to the view as a friendly destination label.
 */
export function VerifyOtpRouteHandler() {
  const params = useSearchParams();
  const destination = params.get("to") ?? undefined;
  return <VerifyOtpView destination={destination} />;
}
