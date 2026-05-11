import { IsEnum } from 'class-validator';

import { ProjectRoleDto } from '../../project/dto/shared.dto';

export class UpdateMemberRoleDto {
  @IsEnum(ProjectRoleDto)
  role!: ProjectRoleDto;
}
