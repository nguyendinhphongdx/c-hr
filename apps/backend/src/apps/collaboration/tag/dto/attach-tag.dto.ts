import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AttachTagDto {
  @IsUUID()
  tagId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(31)
  objectType!: string;

  @IsUUID()
  objectId!: string;
}
