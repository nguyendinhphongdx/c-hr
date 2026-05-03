import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { StorageProvider, UploadOptions } from './storage.interface';

export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath: string;
  private readonly apiBaseUrl: string;

  constructor(configService: ConfigService) {
    const localPath = configService.get<string>('storage.local.path', 'uploads');
    this.basePath = path.isAbsolute(localPath) ? localPath : path.join(process.cwd(), localPath);
    this.apiBaseUrl = configService.get<string>(
      'app.apiBaseURL',
      `http://localhost:${configService.get<number>('app.port', 3000)}`,
    );
    if (!fs.existsSync(this.basePath)) fs.mkdirSync(this.basePath, { recursive: true });
    this.logger.log(`Local storage initialized: ${this.basePath}`);
  }

  async upload(options: UploadOptions): Promise<string> {
    const filePath = path.join(this.basePath, options.key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, options.buffer);
    this.logger.log(`Uploaded: ${options.key}`);
    return options.key;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Deleted: ${key}`);
    }
  }

  getPublicUrl(key: string): string {
    return `${this.apiBaseUrl}/uploads/${key}`;
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.getPublicUrl(key);
  }
}
