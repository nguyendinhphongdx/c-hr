"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { AuthLayout } from "../components/AuthLayout";
import { LoginForm } from "../components/LoginForm";

const LAST_EMAIL_KEY = "auth:lastEmail";
const REMEMBER_ME_KEY = "auth:rememberMe";
const DEFAULT_GREETING = "Chào mừng trở lại";

/** Pull a friendly first name from an email, e.g. "ada.lovelace@..." → "Ada". */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[.\-_+]/)[0] ?? local;
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function readClientGreeting(): string {
  const remembered = localStorage.getItem(REMEMBER_ME_KEY) === "1";
  if (!remembered) return DEFAULT_GREETING;
  const email = localStorage.getItem(LAST_EMAIL_KEY) ?? "";
  const name = nameFromEmail(email);
  return name ? `${DEFAULT_GREETING}, ${name}` : DEFAULT_GREETING;
}

export function LoginView() {
  // useSyncExternalStore gives a stable server snapshot (DEFAULT_GREETING)
  // and reads localStorage only on the client, so hydration matches.
  const greeting = useSyncExternalStore(
    subscribeStorage,
    readClientGreeting,
    () => DEFAULT_GREETING,
  );

  // BE SSO callback redirects here with ?ssoError=... when the OAuth
  // round-trip fails (consent denied, state expired, etc.).
  const params = useSearchParams();
  const ssoError = params.get("ssoError");
  useEffect(() => {
    if (ssoError) {
      toast.error(`Đăng nhập SSO thất bại: ${ssoError}`);
    }
  }, [ssoError]);

  return (
    <AuthLayout title={greeting} subtitle="Đăng nhập để tiếp tục vào C-HR.">
      <LoginForm />
    </AuthLayout>
  );
}
