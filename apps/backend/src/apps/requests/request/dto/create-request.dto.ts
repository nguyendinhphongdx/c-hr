import { IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRequestDto {
  @IsUUID()
  groupId: string;

  /// Must be one of getApproverCandidates(currentEmployeeId).
  @IsUUID()
  approverId: string;

  /// Free-text user-supplied subject line; primary header in list rows + preview.
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  /// Custom-field payload validated server-side against group.fieldsSchema.
  @IsObject()
  data: Record<string, unknown>;

  /// Optional free-form note shown in the list/preview alongside the data.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
