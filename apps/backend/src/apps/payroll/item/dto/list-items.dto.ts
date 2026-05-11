import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListItemsDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
