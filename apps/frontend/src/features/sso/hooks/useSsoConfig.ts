"use client";

import { useMutation } from "@tanstack/react-query";

import { ssoService } from "../services/ssoService";

export function useStartEntra() {
  return useMutation({
    mutationFn: ({ returnTo }: { returnTo?: string }) =>
      ssoService.startEntra(returnTo),
  });
}
