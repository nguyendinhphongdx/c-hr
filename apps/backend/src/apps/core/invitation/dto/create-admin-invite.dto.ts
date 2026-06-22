import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
