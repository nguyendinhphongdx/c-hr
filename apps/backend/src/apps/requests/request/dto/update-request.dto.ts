import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateRequestDto {
  /// User-supplied subject line — same constraints as create.
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  /// Custom-field payload — re-validated against group.fieldsSchema like create.
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  /// Re-assign approver while still PENDING. Must be in
  /// getApproverCandidates(requesterId) — same gate as create.
  @IsOptional()
  @IsUUID()
  approverId?: string;
}
