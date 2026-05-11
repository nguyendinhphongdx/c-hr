import { ArrayUnique, IsArray, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class BulkSetTagsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(31)
  objectType!: string;

  @IsUUID()
  objectId!: string;

  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  tagIds!: string[];
}
