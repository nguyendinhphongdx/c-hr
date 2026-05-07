import { ResourceKind } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateResourceDto {
  @IsEnum(ResourceKind)
  kind!: ResourceKind;

  @IsString()
  @MinLength(1)
  @MaxLength(127)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Optional FK to Department that manages booking permissions. */
  @IsOptional()
  @IsUUID()
  managingDepartmentId?: string;
}
