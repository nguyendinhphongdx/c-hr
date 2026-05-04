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
  window.location.href = "/login";
}

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    if (
      refreshFailed ||
      error.response?.status !== 401 ||
      !config ||
      config._retry
    ) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      await performRefresh();
      return apiClient(config);
    } catch {
      refreshFailed = true;
      redirectToLogin();
      return Promise.reject(error);
    }
  },
);
