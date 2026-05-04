import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadOptions } from './storage.interface';

/**
 * GCS storage provider. Requires `@google-cloud/storage` (optionalDependency).
 */
export class GcsStorageProvider implements StorageProvider {
  private readonly logger = new Logger(GcsStorageProvider.name);
  private bucket: any;
  private bucketName: string;

  constructor(configService: ConfigService) {
    this.bucketName = configService.get<string>('storage.gcs.bucket');
    const projectId = configService.get<string>('storage.gcs.projectId');
    const keyFile = configService.get<string>('storage.gcs.keyFile');
    const credentialsJson = configService.get<string>('storage.gcs.credentials');

    let Storage: any;
    try {
      Storage = require('@google-cloud/storage').Storage;
    } catch {
      throw new Error(
        'STORAGE_TYPE=gcs requires @google-cloud/storage. Run: pnpm add @google-cloud/storage',
      );
    }

    const storageOptions: any = { projectId };
    if (keyFile) storageOptions.keyFilename = keyFile;
    else if (credentialsJson) storageOptions.credentials = JSON.parse(credentialsJson);

    const storage = new Storage(storageOptions);
    this.bucket = storage.bucket(this.bucketName);
    this.logger.log(`GCS storage initialized: bucket=${this.bucketName}`);
  }

  async upload(options: UploadOptions): Promise<string> {
    const file = this.bucket.file(options.key);
    await file.save(options.buffer, {
      contentType: options.mimeType,
      resumable: false,
    });
    return options.key;
  }

  async delete(key: string): Promise<void> {
    const file = this.bucket.file(key);
    await file.delete({ ignoreNotFound: true });
  }

  getPublicUrl(key: string): string {
    return `https://storage.googleapis.com/${this.bucketName}/${key}`;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const [url] = await this.bucket.file(key).getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    return url;
  }
}
