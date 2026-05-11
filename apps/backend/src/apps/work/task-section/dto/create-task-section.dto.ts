import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTaskSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(63)
  name!: string;
}
