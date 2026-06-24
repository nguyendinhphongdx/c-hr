import { randomUUID } from 'crypto';
import * as path from 'path';

import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { STORAGE_PROVIDER, StorageProvider } from '@/libs/storage';

const INLINE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadController {
  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  /**
   * Inline image upload for the shared TextEditor (Tiptap). Any authenticated
   * user can upload — the `pub_` prefix marks the key as publicly readable
   * via the static `/uploads/` mount in `main.ts`.
   */
  @Post('inline-image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: INLINE_IMAGE_MAX_BYTES } }))
  async uploadInlineImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('file là bắt buộc');
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Chỉ chấp nhận tệp ảnh');
    }

    const ext =
      MIME_EXT[file.mimetype] ||
      (file.originalname ? path.extname(file.originalname).slice(1) : '') ||
      'bin';
    const key = `inline-images/pub_inline_${Date.now()}_${randomUUID()}.${ext}`;

    await this.storage.upload({
      key,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    return { url: this.storage.getPublicUrl(key) };
  }
}
