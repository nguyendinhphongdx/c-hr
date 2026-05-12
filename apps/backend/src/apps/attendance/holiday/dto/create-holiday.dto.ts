import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateHolidayDto {
  /** YYYY-MM-DD — single day per row. */
  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(127)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}
