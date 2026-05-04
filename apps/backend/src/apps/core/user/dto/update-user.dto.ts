import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Self-update payload for /users/me. Whitelists only fields the user
 * is allowed to change about themselves — role, organizationId,
 * employeeId are NOT here on purpose (managed by admin / HR flows).
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;
}
