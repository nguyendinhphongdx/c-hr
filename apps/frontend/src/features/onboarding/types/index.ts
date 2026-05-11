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

// ─── Plans + Tasks (Phase 3) ────────────────────────────────────────

export interface OnboardingPlanEmployee {
  id: ID;
  code: string;
  user: {
    id: ID;
    name: Nullable<string>;
    email: string;
    avatar: Nullable<string>;
  } | null;
  department: { id: ID; name: string } | null;
}

export interface OnboardingTaskAssignee {
  id: ID;
  name: Nullable<string>;
  email: string;
  avatar: Nullable<string>;
}

export interface OnboardingTaskRow {
  id: ID;
  organizationId: ID;
  planId: ID;
  templateTaskId: Nullable<ID>;
  title: string;
  description: Nullable<string>;
  order: number;
  assigneeId: ID;
  assignee?: OnboardingTaskAssignee | null;
  dueDate: Nullable<ISODate>;
  status: OnboardingTaskStatus;
  completedAt: Nullable<ISODate>;
  completedById: Nullable<ID>;
  completedNote: Nullable<string>;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface OnboardingTaskAclView {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canComplete: boolean;
  canReassign: boolean;
}

export interface OnboardingTaskDetail extends OnboardingTaskRow {
  plan: {
    id: ID;
    status: OnboardingPlanStatus;
    templateNameSnapshot: string;
    employee: {
      id: ID;
      code: string;
      user: { id: ID; name: Nullable<string>; email: string } | null;
    };
  };
  view: OnboardingTaskAclView;
}

export interface OnboardingPlanRow {
  id: ID;
  organizationId: ID;
  employeeId: ID;
  employee: OnboardingPlanEmployee;
  templateId: ID;
  templateNameSnapshot: string;
  status: OnboardingPlanStatus;
  startedAt: Nullable<ISODate>;
  completedAt: Nullable<ISODate>;
  createdById: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
  tasks: OnboardingTaskRow[];
  template?: { id: ID; name: string } | null;
}

export interface OnboardingPlanAclView {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canArchive: boolean;
}

export interface OnboardingPlanDetail extends OnboardingPlanRow {
  view: OnboardingPlanAclView;
}

export interface ListPlansQuery {
  status?: OnboardingPlanStatus;
  employeeId?: string;
  /** Client-side only — free-text search across employee code/name/email. */
  q?: string;
}

export interface CreatePlanInput {
  employeeId: string;
  templateId: string;
  note?: string;
}

export interface AddTaskInput {
  title: string;
  description?: string | null;
  assigneeUserId: string;
  dueDate?: string | null;
  order?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}

export interface CompleteTaskInput {
  note?: string;
}

export interface ReassignTaskInput {
  assigneeUserId: string;
  note?: string;
}
