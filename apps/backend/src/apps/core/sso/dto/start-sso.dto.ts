import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class StartSsoDto {
  /** Org slug to look up which Entra tenant to redirect to. */
  @IsString()
  @MinLength(1)
  @MaxLength(127)
  orgSlug!: string;

  /** Optional return path within the FE (vd "/requests/abc"). */
  @IsString()
  @IsOptional()
  @MaxLength(512)
  returnTo?: string;
}
