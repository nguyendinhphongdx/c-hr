import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * AES-256-GCM encryption for at-rest secrets (OAuth client secrets, etc.).
 * Key derived via SHA-256 from `CRYPTO_SECRET` env. Ciphertext format:
 *   base64( iv[12] || tag[16] || ciphertext )
 *
 * Pattern matches AttendanceDevice token storage; reuse via DI.
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const secret = config.get<string>('crypto.secret') || config.get<string>('CRYPTO_SECRET');
    if (!secret) {
      this.logger.warn(
        'CRYPTO_SECRET env not set — falling back to jwtAccessSecret. ' +
          'Set CRYPTO_SECRET (>=32 chars) before production.',
      );
    }
    const material =
      secret ?? config.get<string>('auth.jwtAccessSecret') ?? 'c-hr-dev-crypto-fallback';
    this.key = crypto.createHash('sha256').update(material).digest();
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  decrypt(b64: string): string {
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 28) throw new Error('Ciphertext too short');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }
}
