import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  /** Optional: if missing, the controller will read from the refresh cookie. */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
