"use client";

import { useState } from "react";

import { AuthLayout } from "../components/AuthLayout";
import { LoginForm } from "../components/LoginForm";

const LAST_EMAIL_KEY = "auth:lastEmail";
const REMEMBER_ME_KEY = "auth:rememberMe";

/** Pull a friendly first name from an email, e.g. "ada.lovelace@..." → "Ada". */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[.\-_+]/)[0] ?? local;
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

function readGreeting(): string {
  if (typeof window === "undefined") return "Chào mừng trở lại";
  const remembered = localStorage.getItem(REMEMBER_ME_KEY) === "1";
  if (!remembered) return "Chào mừng trở lại";
  const email = localStorage.getItem(LAST_EMAIL_KEY) ?? "";
  const name = nameFromEmail(email);
  return name ? `Chào mừng trở lại, ${name}` : "Chào mừng trở lại";
}

export function LoginView() {
  const [greeting] = useState(readGreeting);

  return (
    <AuthLayout title={greeting} subtitle="Đăng nhập để tiếp tục vào C-HR.">
      <LoginForm />
    </AuthLayout>
  );
}
