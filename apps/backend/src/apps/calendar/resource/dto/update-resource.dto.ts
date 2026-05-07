import { ResourceKind } from '@prisma/client';
import { Transform } from 'class-transformer';
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

const passThrough = ({ value }: { value: unknown }) => value;

export class UpdateResourceDto {
  @IsOptional()
  @IsEnum(ResourceKind)
  kind?: ResourceKind;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(127)
  name?: string;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  description?: string | null;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @Transform(passThrough)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  capacity?: number | null;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Transform(passThrough)
  @IsOptional()
  @IsUUID()
  managingDepartmentId?: string | null;
}
