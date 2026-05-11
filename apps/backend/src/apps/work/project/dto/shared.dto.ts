/**
 * Mirror of Prisma's ProjectRole enum so DTOs can reference it via
 * `@IsEnum(ProjectRoleDto)` without dragging Prisma types into the
 * validator metadata. Values must match Prisma 1-1.
 */
export enum ProjectRoleDto {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  COMMENTER = 'COMMENTER',
  VIEWER = 'VIEWER',
}
