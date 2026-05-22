import { JobBoard } from '@prisma/client';

export interface BoardCredentials {
  apiKey: string;
  webhookSecret?: string;
  /**
   * Allow board-specific extras (TopCV `secretKey`, ITviec `clientId`,
   * …) without widening the core type. Adapter casts as needed.
   */
  [extra: string]: unknown;
}

export interface WorkAddressInput {
  city: string;
  district?: string;
  address?: string;
}

export interface PublishJobInput {
  internalJobId: string;
  title: string;
  description: string;
  requirements: string;
  benefits?: string;
  jobType:
    | 'FULL_TIME'
    | 'PART_TIME'
    | 'CONTRACT'
    | 'INTERN'
    | 'FREELANCE';
  workMode: 'ONSITE' | 'REMOTE' | 'HYBRID';
  workAddresses: WorkAddressInput[];
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryNegotiable?: boolean;
  currency?: string;
  requiredSkills: string[];
  niceToHaveSkills?: string[];
  headcount: number;
  isUrgent?: boolean;
  expiresAt?: Date;
  /** External link to the C-HR-hosted job page (for "Apply on partner site"). */
  externalUrl?: string;
}

export interface PublishJobResult {
  externalId: string;
  externalUrl?: string;
}

export interface IncomingApplication {
  externalApplicationId: string;
  externalJobId: string;
  candidate: {
    fullName: string;
    email: string;
    phone?: string;
    headline?: string;
    location?: string;
    linkedinUrl?: string;
    resumeUrl?: string;
    coverLetter?: string;
    expectedSalary?: number;
  };
  appliedAt: Date;
}

/**
 * One adapter per supported job board. Centralised contract so the
 * push/sync service doesn't have to branch on `board`.
 */
export interface JobBoardAdapter {
  readonly board: JobBoard;

  publish(
    input: PublishJobInput,
    creds: BoardCredentials,
  ): Promise<PublishJobResult>;

  update(
    externalId: string,
    input: Partial<PublishJobInput>,
    creds: BoardCredentials,
  ): Promise<void>;

  close(externalId: string, creds: BoardCredentials): Promise<void>;

  /**
   * Verify whether the supplied credentials work (e.g. call
   * `GET /open-api/categories`). Returns silently on success, throws
   * if the board rejects the key — used to gate "Save & enable".
   */
  validateCredentials(creds: BoardCredentials): Promise<void>;

  /**
   * Verify HMAC signature on inbound webhooks. Throws if invalid.
   * Implementation differs per board (header name, encoding, etc.).
   */
  verifyWebhookSignature(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    creds: BoardCredentials,
  ): void;

  /**
   * Convert a raw board webhook payload into our internal shape. Lets
   * the webhook controller stay board-agnostic.
   */
  parseWebhookEvent(
    body: unknown,
  ): { event: string; data: IncomingApplication | null };
}
