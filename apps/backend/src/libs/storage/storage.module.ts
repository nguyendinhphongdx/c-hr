import { Global, Module, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER, StorageProvider } from './providers/storage.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { GcsStorageProvider } from './providers/gcs-storage.provider';
import { FileIns } from './file-ins';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (configService: ConfigService): StorageProvider => {
        const type = configService.get<string>('storage.type', 'local');
        switch (type) {
          case 's3':
            return new S3StorageProvider(configService);
          case 'gcs':
            return new GcsStorageProvider(configService);
          case 'local':
          default:
            return new LocalStorageProvider(configService);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule implements OnModuleInit {
  constructor(
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const apiBase = this.configService.get<string>('app.apiBaseURL', 'http://localhost:3000');
    const apiPrefix = this.configService.get<string>('app.apiPrefix', 'api/v1');
    FileIns.init(this.storage, `${apiBase}/${apiPrefix}`);
  }
}
