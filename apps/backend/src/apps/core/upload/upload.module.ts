import { Module } from '@nestjs/common';

import { UploadController } from './upload.controller';

/**
 * Generic file upload endpoints. Currently exposes `/uploads/inline-image`
 * used by the shared TextEditor (Tiptap) for paste/drop/button image uploads.
 * `StorageModule` is `@Global()` so we inject `STORAGE_PROVIDER` directly.
 */
@Module({
  controllers: [UploadController],
})
export class UploadModule {}
