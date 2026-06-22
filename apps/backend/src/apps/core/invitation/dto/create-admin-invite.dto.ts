import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateAdminInviteDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  message?: string;

  /** Role granted to the new User. Defaults to `user`. The service
   *  validates the caller has authority to grant this role (admin
   *  can grant admin/user; sysowner can grant any). */
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
