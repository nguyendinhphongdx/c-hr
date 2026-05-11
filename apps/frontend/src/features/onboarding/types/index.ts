import type { ID, ISODate, Nullable } from "@/lib/types";

export type AssigneeRole = "HR" | "MANAGER" | "EMPLOYEE" | "IT" | "CUSTOM";

export type OnboardingPlanStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ARCHIVED";

export type OnboardingTaskStatus = "TODO" | "DONE";

export interface OnboardingTemplateTask {
  id: ID;
  templateId: ID;
  title: string;
  description: Nullable<string>;
  order: number;
  defaultAssigneeRole: AssigneeRole;
  defaultAssigneeUserId: Nullable<ID>;
  dueOffsetDays: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface OnboardingTemplate {
  id: ID;
  organizationId: ID;
  name: string;
  description: Nullable<string>;
  isActive: boolean;
  isDefault: boolean;
  createdById: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt: Nullable<ISODate>;
  tasks: OnboardingTemplateTask[];
  _count?: { tasks: number; plans: number };
}

export interface ListTemplatesQuery {
  q?: string;
  /** Pass `"true"`/`"false"` to filter by isActive. Omit for all. */
  active?: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface CreateTemplateTaskInput {
  title: string;
  description?: string | null;
  defaultAssigneeRole?: AssigneeRole;
  defaultAssigneeUserId?: string | null;
  dueOffsetDays?: number;
}

export interface UpdateTemplateTaskInput {
  title?: string;
  description?: string | null;
  defaultAssigneeRole?: AssigneeRole;
  defaultAssigneeUserId?: string | null;
  dueOffsetDays?: number;
}

export interface ReorderTemplateTasksInput {
  ids: ID[];
}
