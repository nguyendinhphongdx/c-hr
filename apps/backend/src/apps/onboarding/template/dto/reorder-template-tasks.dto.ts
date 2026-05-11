import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderTemplateTasksDto {
  /** Tasks in their new visual order. Must list every task of the template. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID(undefined, { each: true })
  ids!: string[];
}
