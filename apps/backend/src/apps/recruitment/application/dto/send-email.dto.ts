import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendApplicationEmailDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  subject!: string;

  @ApiProperty({ description: 'HTML body. Sanitized server-side.' })
  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  bodyHtml!: string;

  @ApiPropertyOptional({ description: 'Optional Reply-To header.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  replyTo?: string;
}
