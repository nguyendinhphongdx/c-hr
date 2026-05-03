"use client";

import { useEffect, useState } from "react";

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

export function LoginView() {
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const remembered = localStorage.getItem(REMEMBER_ME_KEY) === "1";
    const email = localStorage.getItem(LAST_EMAIL_KEY) ?? "";
    if (remembered && email) {
      const name = nameFromEmail(email);
      if (name) setGreeting(`Welcome back, ${name}`);
    }
  }, []);

  return (
    <AuthLayout title={greeting} subtitle="Sign in to continue.">
      <LoginForm />
    </AuthLayout>
  );
}
