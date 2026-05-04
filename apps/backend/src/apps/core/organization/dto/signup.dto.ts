import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  organizationName: string;

  /** Used in URLs — kebab-case lowercase, immutable after signup. */
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, digits and hyphens',
  })
  slug: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  adminName: string;
}
