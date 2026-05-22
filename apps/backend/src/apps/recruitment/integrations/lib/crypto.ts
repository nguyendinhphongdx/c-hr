import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * AES-256-GCM envelope for API credentials.
 *
 * Format on disk: `${ivBase64}:${tagBase64}:${ciphertextBase64}`.
 *
 * The key is derived from `RECRUITMENT_CREDENTIALS_KEY` env var via
 * SHA-256 so any string-length input becomes a valid 32-byte key. Set
 * a stable secret per-deploy; rotating it invalidates all stored
 * credentials (re-paste needed).
 */

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.RECRUITMENT_CREDENTIALS_KEY ?? '';
  if (!raw) {
    throw new Error(
      'RECRUITMENT_CREDENTIALS_KEY env var must be set to encrypt job-board credentials',
    );
  }
  return createHash('sha256').update(raw).digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const plain = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptJson<T = unknown>(blob: string): T {
  const parts = blob.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted credentials blob');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plain.toString('utf8')) as T;
}

/**
 * Mask everything but the last 4 chars. Used for displaying the token
 * preview to admins ("•••••••• abc1").
 */
export function maskTail(value: string, keep = 4): string {
  if (value.length <= keep) return '•'.repeat(value.length);
  return `${'•'.repeat(Math.min(8, value.length - keep))} ${value.slice(-keep)}`;
}
