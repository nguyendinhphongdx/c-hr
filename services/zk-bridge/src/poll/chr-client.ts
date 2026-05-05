import axios, { AxiosError } from 'axios';
import type { AttendanceEvent, PushAttendanceBody } from './types';

export interface PushClientConfig {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
}

export async function pushEvents(
  cfg: PushClientConfig,
  events: AttendanceEvent[],
): Promise<void> {
  const body: PushAttendanceBody = {
    token: cfg.token,
    events,
  };
  const url = `${cfg.baseUrl.replace(/\/$/, '')}/attendance-devices/push`;
  try {
    await axios.post(url, body, { timeout: cfg.timeoutMs ?? 30_000 });
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const data = err.response?.data;
      const detail = typeof data === 'string' ? data : JSON.stringify(data ?? err.message);
      throw new Error(
        `C-HR push failed${status ? ` (HTTP ${status})` : ''}: ${detail}`,
      );
    }
    throw err;
  }
}
