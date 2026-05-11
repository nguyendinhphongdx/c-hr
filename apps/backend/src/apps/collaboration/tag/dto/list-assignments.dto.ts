import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ListAssignmentsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(31)
  objectType!: string;

  @IsUUID()
  objectId!: string;
}
