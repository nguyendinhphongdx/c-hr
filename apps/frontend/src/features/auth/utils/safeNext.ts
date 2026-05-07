/**
 * Sanitize a `?next=` value so we only ever redirect within our own app.
 * Refuses absolute URLs, paths that go back to auth pages (would loop),
 * and anything that doesn't start with a single `/`.
 */
const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-otp",
];

export function safeNextPath(raw: string | null): string {
  if (!raw) return "/home";
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return "/home";
  }
  if (!value.startsWith("/") || value.startsWith("//")) return "/home";
  for (const route of AUTH_ROUTES) {
    if (value === route || value.startsWith(`${route}?`) || value.startsWith(`${route}/`)) {
      return "/home";
    }
  }
  return value;
}

/** Read the `next` param from the current URL on the client. */
export function readNextFromLocation(): string {
  if (typeof window === "undefined") return "/home";
  const params = new URLSearchParams(window.location.search);
  return safeNextPath(params.get("next"));
}
