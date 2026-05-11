import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTaskSectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(63)
  name?: string;
}
