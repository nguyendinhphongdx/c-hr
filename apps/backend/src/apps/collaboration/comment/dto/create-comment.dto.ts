import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CommentMentionDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  token: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  bodyHtml: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommentMentionDto)
  mentions?: CommentMentionDto[];
}
