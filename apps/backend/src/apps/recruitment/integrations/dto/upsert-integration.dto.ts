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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  webhookSecret?: string;
}
