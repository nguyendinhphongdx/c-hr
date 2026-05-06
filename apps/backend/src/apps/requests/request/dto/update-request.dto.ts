import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class UpdateRequestDto {
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
