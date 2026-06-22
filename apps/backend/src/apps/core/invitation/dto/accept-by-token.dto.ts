import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** POST /invitations/by-token/:token/accept — password-based accept.
 *  SSO-based accept happens transparently inside the SSO callback. */
export class AcceptByTokenDto {
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;
}
