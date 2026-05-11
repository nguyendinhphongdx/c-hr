/**
 * Mirrors of Prisma's Task enums so DTOs can reference them via
 * `@IsEnum(...)` without dragging Prisma types into validator metadata.
 * Values must match Prisma 1-1.
 */
export enum TaskStatusDto {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriorityDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
