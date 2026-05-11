import { Transform } from 'class-transformer';
import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const passThrough = ({ value }: { value: unknown }) => value;

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(63)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  @MaxLength(31)
  scope?: string | null;
}
