import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobBoard } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpsertIntegrationDto {
  @ApiProperty({ enum: JobBoard })
  @IsEnum(JobBoard)
  board!: JobBoard;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  apiKey!: string;

  /**
   * Some boards (TopCV) pair the API key with a separate Secret key
   * that the adapter sends as an extra `X-Secret-Key` header. Optional
   * for boards that only use a single token (talent.vn).
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  secretKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  webhookSecret?: string;
}
