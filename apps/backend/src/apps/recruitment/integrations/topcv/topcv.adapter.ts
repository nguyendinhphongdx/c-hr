import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JobBoard } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';

import {
  BoardCredentials,
  IncomingApplication,
  JobBoardAdapter,
  PublishJobInput,
  PublishJobResult,
} from '../adapter.interface';

/**
 * TopCV adapter — same shape as talent.vn (X-Api-Key + HMAC-signed
 * outbound webhooks). TopCV's public API isn't documented yet, but the
 * BD team confirms the endpoints below match the integration spec
 * they ship to partners.
 *
 * If TopCV changes path/header names, override here only — the contract
 * with the rest of the app stays the same.
 */
@Injectable()
export class TopCvAdapter implements JobBoardAdapter {
  readonly board = JobBoard.TOPCV;
  private readonly logger = new Logger(TopCvAdapter.name);

  private get baseUrl(): string {
    return (
      process.env.TOPCV_BASE_URL ?? 'https://api.topcv.vn'
    ).replace(/\/+$/, '');
  }

  async publish(
    input: PublishJobInput,
    creds: BoardCredentials,
  ): Promise<PublishJobResult> {
    const res = await this.request<{
      id: string;
      url?: string;
    }>('POST', '/open-api/jobs', creds, this.buildPublishBody(input));
    return { externalId: res.id, externalUrl: res.url };
  }

  async update(
    externalId: string,
    input: Partial<PublishJobInput>,
    creds: BoardCredentials,
  ): Promise<void> {
    await this.request(
      'PUT',
      `/open-api/jobs/${encodeURIComponent(externalId)}`,
      creds,
      this.buildPublishBody(input as PublishJobInput, true),
    );
  }

  async close(externalId: string, creds: BoardCredentials): Promise<void> {
    await this.request(
      'POST',
      `/open-api/jobs/${encodeURIComponent(externalId)}/close`,
      creds,
    );
  }

  async validateCredentials(creds: BoardCredentials): Promise<void> {
    // TopCV doesn't expose `/categories` — use the lightest GET we know
    // works: list jobs (page size 1). If they reject auth, this 401s.
    await this.request('GET', '/open-api/jobs?limit=1', creds);
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    creds: BoardCredentials,
  ): void {
    const sig =
      pickHeader(headers, 'x-topcv-signature') ??
      pickHeader(headers, 'x-signature');
    if (!sig) {
      throw new UnauthorizedException(
        'Missing X-TopCV-Signature / X-Signature header',
      );
    }
    // TopCV doesn't expose a separate "webhook secret" field in their
    // partner UI — they sign with the same Secret Key the partner
    // pastes into Base Hiring / similar ATSes. Prefer the explicit
    // webhookSecret when set (some accounts may roll one out later),
    // else fall back to the secretKey, else apiKey as a last resort.
    const secret =
      creds.webhookSecret ??
      (typeof creds.secretKey === 'string' ? creds.secretKey : undefined) ??
      creds.apiKey;
    if (!secret) {
      throw new BadRequestException(
        'No secret available to verify TopCV webhook',
      );
    }
    const expected = createHmac('sha256', secret)
      .update(rawBody as Buffer)
      .digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(sig, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  parseWebhookEvent(body: unknown): {
    event: string;
    data: IncomingApplication | null;
  } {
    if (!body || typeof body !== 'object') {
      return { event: 'unknown', data: null };
    }
    const b = body as Record<string, unknown>;
    const event = String(b.event ?? '');
    if (event !== 'application.created') {
      return { event, data: null };
    }
    const data = (b.data ?? b) as Record<string, unknown>;
    const appliedAtRaw =
      (data.appliedAt as string | undefined) ??
      (data.applied_at as string | undefined);
    const candidate =
      ((data.candidate as Record<string, unknown> | undefined) ?? data) ?? {};
    return {
      event,
      data: {
        externalApplicationId: String(
          data.applicationId ?? data.application_id ?? '',
        ),
        externalJobId: String(data.jobId ?? data.job_id ?? ''),
        externalJobTitle:
          typeof data.jobTitle === 'string'
            ? data.jobTitle
            : typeof data.job_title === 'string'
              ? (data.job_title as string)
              : undefined,
        candidate: {
          fullName: String(
            candidate.fullName ?? candidate.name ?? 'Unknown',
          ),
          email: String(candidate.email ?? ''),
          phone:
            typeof candidate.phone === 'string' ? candidate.phone : undefined,
          headline:
            typeof candidate.headline === 'string'
              ? candidate.headline
              : undefined,
          resumeUrl:
            typeof candidate.resumeUrl === 'string'
              ? candidate.resumeUrl
              : typeof candidate.resume_url === 'string'
                ? (candidate.resume_url as string)
                : undefined,
          coverLetter:
            typeof candidate.coverLetter === 'string'
              ? candidate.coverLetter
              : undefined,
          expectedSalary:
            typeof candidate.expectedSalary === 'number'
              ? candidate.expectedSalary
              : undefined,
        },
        appliedAt: appliedAtRaw ? new Date(appliedAtRaw) : new Date(),
      },
    };
  }

  private async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    creds: BoardCredentials,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'X-Api-Key': creds.apiKey,
      Accept: 'application/json',
    };
    // TopCV's partner spec uses a paired "X-Secret-Key" header in addition
    // to the API key — pass it through when present in the credentials
    // blob. Older accounts only have apiKey; that case still works.
    if (typeof creds.secretKey === 'string' && creds.secretKey) {
      headers['X-Secret-Key'] = creds.secretKey;
    }
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const message = `TopCV ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`;
      this.logger.warn(message);
      if (res.status === 401 || res.status === 403) {
        throw new UnauthorizedException('TopCV rejected the credentials');
      }
      throw new BadRequestException(message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private buildPublishBody(
    input: PublishJobInput,
    partial = false,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (!partial || input.title !== undefined) body.title = input.title;
    if (!partial || input.description !== undefined)
      body.description = input.description;
    if (!partial || input.requirements !== undefined)
      body.requirements = input.requirements;
    if (input.benefits !== undefined) body.benefits = input.benefits;
    if (input.jobType) body.jobType = input.jobType;
    if (input.workMode) body.workMode = input.workMode;
    if (input.workAddresses?.length) body.workAddresses = input.workAddresses;
    if (input.experienceMin !== undefined)
      body.experienceMin = input.experienceMin;
    if (input.experienceMax !== undefined)
      body.experienceMax = input.experienceMax;
    if (input.salaryMin !== undefined) body.salaryMin = input.salaryMin;
    if (input.salaryMax !== undefined) body.salaryMax = input.salaryMax;
    if (input.salaryNegotiable !== undefined)
      body.salaryNegotiable = input.salaryNegotiable;
    if (input.currency) body.currency = input.currency;
    if (input.requiredSkills) body.requiredSkills = input.requiredSkills;
    if (input.niceToHaveSkills)
      body.niceToHaveSkills = input.niceToHaveSkills;
    if (input.headcount !== undefined) body.headcount = input.headcount;
    if (input.isUrgent !== undefined) body.isUrgent = input.isUrgent;
    if (input.expiresAt) body.expiresAt = input.expiresAt.toISOString();
    if (input.internalJobId) body.externalId = input.internalJobId;
    if (input.externalUrl) body.externalUrl = input.externalUrl;
    return body;
  }
}

function pickHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const direct = headers[name] ?? headers[name.toLowerCase()];
  if (!direct) return null;
  return Array.isArray(direct) ? direct[0] ?? null : direct;
}
