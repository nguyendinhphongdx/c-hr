import { ResourceKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

const toBool = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  return undefined;
};

export class ListResourcesDto {
  @IsOptional()
  @IsEnum(ResourceKind)
  kind?: ResourceKind;

  @IsOptional()
  @IsString()
  @MaxLength(127)
  q?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  activeOnly?: boolean;
}
