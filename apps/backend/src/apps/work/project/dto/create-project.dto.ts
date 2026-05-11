import { ProjectVisibility } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { ProjectRoleDto } from './shared.dto';

export class InitialMemberDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsEnum(ProjectRoleDto)
  role?: ProjectRoleDto;
}

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(127)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Optional override — service auto-generates from `name` when omitted. */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(8)
  @Matches(/^[A-Z0-9]+$/, { message: 'Slug must be uppercase letters/digits' })
  slug?: string;

  @IsOptional()
  @IsEnum(ProjectVisibility)
  visibility?: ProjectVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(31)
  icon?: string;

  /** Override owner — defaults to caller (User). HRM admin only when set. */
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  /** Members added on create (besides the owner, who is auto-added). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => InitialMemberDto)
  members?: InitialMemberDto[];
}
