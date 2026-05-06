import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateEmployeeRoleDto {
  @IsEnum(Role)
  role!: Role;
}
