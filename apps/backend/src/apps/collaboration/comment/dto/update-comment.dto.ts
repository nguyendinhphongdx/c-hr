import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { CommentMentionDto } from './create-comment.dto';

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  bodyHtml: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommentMentionDto)
  mentions?: CommentMentionDto[];
}
