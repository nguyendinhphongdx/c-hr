import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Render free tier sleeps a service after ~15 min idle. We schedule a
 * periodic self-ping so the dyno stays warm. The ping must hit the
 * PUBLIC URL (not localhost) — Render only counts inbound HTTP from
 * the internet as activity.
 *
 * Set `KEEP_ALIVE_URL` to enable; falls back to `RENDER_EXTERNAL_URL`
 * (Render auto-injects this in production). Skipped when neither is set
 * so dev runs stay quiet.
 */
@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly externalProbeUrl =
    process.env.KEEP_ALIVE_PROBE_URL ?? 'https://www.google.com/generate_204';

  @Cron(CronExpression.EVERY_10_MINUTES)
  async ping(): Promise<void> {
    const baseUrl = process.env.KEEP_ALIVE_URL ?? process.env.RENDER_EXTERNAL_URL;
    if (!baseUrl) return;

    const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
    const selfUrl = `${baseUrl.replace(/\/$/, '')}/${apiPrefix}/health`;

    await this.fetchOnce(this.externalProbeUrl, 'external');
    await this.fetchOnce(selfUrl, 'self');
  }

  private async fetchOnce(url: string, label: string): Promise<void> {
    const started = Date.now();
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(10_000),
      });
      const ms = Date.now() - started;
      this.logger.log(`keep-alive ${label} ${res.status} (${ms}ms) ${url}`);
    } catch (err) {
      const ms = Date.now() - started;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`keep-alive ${label} failed (${ms}ms) ${url}: ${msg}`);
    }
  }
}
