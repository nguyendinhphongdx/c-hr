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
 * talent.vn adapter — follows the Open API spec from the partner doc.
 * Base URL is per-deploy (`TALENT_VN_BASE_URL`); defaults to the
 * production endpoint.
 */
@Injectable()
export class TalentVnAdapter implements JobBoardAdapter {
  readonly board = JobBoard.TALENT_VN;
  private readonly logger = new Logger(TalentVnAdapter.name);

  private get baseUrl(): string {
    return (
      process.env.TALENT_VN_BASE_URL ?? 'https://api.talent.rework.vn'
    ).replace(/\/+$/, '');
  }

  async publish(
    input: PublishJobInput,
    creds: BoardCredentials,
  ): Promise<PublishJobResult> {
    const res = await this.request<{
      id: string;
      url?: string;
    }>('POST', '/api/v1/open-api/jobs', creds, this.buildPublishBody(input));
    return { externalId: res.id, externalUrl: res.url };
  }

  async update(
    externalId: string,
    input: Partial<PublishJobInput>,
    creds: BoardCredentials,
  ): Promise<void> {
    await this.request(
      'PUT',
      `/api/v1/open-api/jobs/${encodeURIComponent(externalId)}`,
      creds,
      this.buildPublishBody(input as PublishJobInput, true),
    );
  }

  async close(externalId: string, creds: BoardCredentials): Promise<void> {
    await this.request(
      'POST',
      `/api/v1/open-api/jobs/${encodeURIComponent(externalId)}/close`,
      creds,
    );
  }

  async validateCredentials(creds: BoardCredentials): Promise<void> {
    await this.request('GET', '/api/v1/open-api/categories', creds);
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    creds: BoardCredentials,
  ): void {
    const sig = pickHeader(headers, 'x-talent-signature');
    if (!sig) {
      throw new UnauthorizedException('Missing X-Talent-Signature header');
    }
    const secret = creds.webhookSecret;
    if (!secret) {
      throw new BadRequestException(
        'Webhook secret not configured for this integration',
      );
    }
    const expected = createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : rawBody)
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
    const data = (b.data ?? {}) as Record<string, unknown>;
    const appliedAtRaw = data.appliedAt as string | undefined;
    return {
      event,
      data: {
        externalApplicationId: String(data.applicationId ?? ''),
        externalJobId: String(data.jobId ?? ''),
        candidate: {
          fullName: String(data.candidateName ?? 'Unknown'),
          email: String(data.candidateEmail ?? ''),
          phone:
            typeof data.candidatePhone === 'string'
              ? data.candidatePhone
              : undefined,
          resumeUrl:
            typeof data.resumeUrl === 'string' ? data.resumeUrl : undefined,
          coverLetter:
            typeof data.coverLetter === 'string'
              ? data.coverLetter
              : undefined,
          expectedSalary:
            typeof data.expectedSalary === 'number'
              ? data.expectedSalary
              : undefined,
        },
        appliedAt: appliedAtRaw ? new Date(appliedAtRaw) : new Date(),
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────

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
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const message = `talent.vn ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`;
      this.logger.warn(message);
      if (res.status === 401 || res.status === 403) {
        throw new UnauthorizedException('talent.vn rejected the credentials');
      }
      throw new BadRequestException(message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** Map our internal job shape to talent.vn's expected payload. */
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
