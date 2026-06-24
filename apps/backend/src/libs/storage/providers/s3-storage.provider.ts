import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadOptions } from './storage.interface';

/**
 * S3 storage provider. Requires `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
 * (listed under optionalDependencies). Install only if STORAGE_TYPE=s3.
 */
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private client: any;
  private getSignedUrlFn: any;
  private GetObjectCommand: any;
  private PutObjectCommand: any;
  private DeleteObjectCommand: any;
  private bucket: string;
  private region: string;

  constructor(configService: ConfigService) {
    this.bucket = configService.get<string>('storage.s3.bucket');
    this.region = configService.get<string>('storage.s3.region', 'us-east-1');
    const accessKeyId = configService.get<string>('storage.s3.accessKeyId');
    const secretAccessKey = configService.get<string>('storage.s3.secretAccessKey');

    let S3Client: any;
    try {
      const aws = require('@aws-sdk/client-s3');

      const presigner = require('@aws-sdk/s3-request-presigner');
      S3Client = aws.S3Client;
      this.GetObjectCommand = aws.GetObjectCommand;
      this.PutObjectCommand = aws.PutObjectCommand;
      this.DeleteObjectCommand = aws.DeleteObjectCommand;
      this.getSignedUrlFn = presigner.getSignedUrl;
    } catch {
      throw new Error(
        'STORAGE_TYPE=s3 requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner. Run: pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner',
      );
    }

    const endpoint = configService.get<string>('storage.s3.endpoint');
    this.client = new S3Client({
      region: this.region,
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
      ...(endpoint && { endpoint, forcePathStyle: true }),
    });
    this.logger.log(
      `S3 storage initialized: bucket=${this.bucket} region=${this.region}${endpoint ? ` endpoint=${endpoint}` : ''}`,
    );
  }

  async upload(options: UploadOptions): Promise<string> {
    await this.client.send(
      new this.PutObjectCommand({
        Bucket: this.bucket,
        Key: options.key,
        Body: options.buffer,
        ContentType: options.mimeType,
      }),
    );
    return options.key;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new this.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new this.GetObjectCommand({ Bucket: this.bucket, Key: key });
    return this.getSignedUrlFn(this.client, command, { expiresIn });
  }
}
