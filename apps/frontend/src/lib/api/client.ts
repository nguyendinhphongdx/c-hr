import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/**
 * BE wraps every response in `{ success: true, data: ... }` via
 * common/interceptors/transform.interceptor.ts. Unwrap once here so every
 * service caller reads `res.data` as the actual payload.
 */
apiClient.interceptors.response.use((response) => {
  const body = response.data;
  if (
    body &&
    typeof body === "object" &&
    body.success === true &&
    "data" in body
  ) {
    response.data = body.data;
  }
  return response;
});

let refreshInFlight: Promise<void> | null = null;
let refreshFailed = false;

export function resetSession(): void {
  refreshInFlight = null;
  refreshFailed = false;
}

function performRefresh(): Promise<void> {
  refreshInFlight ??= axios
    .post(
      `${apiClient.defaults.baseURL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  // Preserve where the user was heading so login can bounce them back.
  const here = window.location.pathname + window.location.search;
  window.location.href = `/login?next=${encodeURIComponent(here)}`;
}

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean };

/**
 * Endpoints that should NOT trigger a refresh attempt on 401:
 *  - `/auth/login`        — wrong password / unverified email is the
 *    user's own input, not an expired session.
 *  - `/auth/refresh`      — recursing on the refresh endpoint itself
 *    is a session failure, surface it directly.
 *  - `/auth/logout`       — already discarding the session.
 *  - `/auth/register`     — pre-auth.
 *  - `/organizations/signup` — pre-auth (creates Org + first admin).
 */
const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/register",
  "/organizations/signup",
];

function isAuthFlowEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return NO_REFRESH_PATHS.some((p) => url.includes(p));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    // Skip the refresh dance entirely for non-401, missing config, or
    // already-retried requests. Also skip for auth-flow endpoints — a 401
    // from /auth/login is "wrong password", not "session expired".
    if (
      refreshFailed ||
      error.response?.status !== 401 ||
      !config ||
      config._retry ||
      isAuthFlowEndpoint(config.url)
    ) {
      return Promise.reject(error);
    }

    config._retry = true;

    // Try to refresh the session. If THIS step fails, the session is
    // toast — flag it and bounce to login.
    try {
      await performRefresh();
    } catch {
      refreshFailed = true;
      redirectToLogin();
      return Promise.reject(error);
    }

    // Refresh succeeded — replay the original request once. Whatever
    // happens here (200, 4xx, 5xx) is the call's own concern; do NOT
    // treat it as a session failure. The interceptor will run again for
    // any error, but `_retry=true` short-circuits it on 401, and other
    // statuses propagate to the caller's catch.
    return apiClient(config);
  },
);
