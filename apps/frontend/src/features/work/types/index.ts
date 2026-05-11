import type { ID, ISODate, Nullable } from "@/lib/types";

export type ProjectStatus = "PLANNING" | "ACTIVE" | "PAUSED" | "DONE";
export type ProjectVisibility = "PRIVATE" | "PUBLIC";
export type ProjectRole = "OWNER" | "EDITOR" | "COMMENTER" | "VIEWER";

export interface UserSummary {
  id: ID;
  name: Nullable<string>;
  email: string;
  avatar: Nullable<string>;
}

export interface ProjectMember {
  id: ID;
  projectId: ID;
  userId: ID;
  role: ProjectRole;
  joinedAt: ISODate;
  user: UserSummary;
}

export interface TaskSection {
  id: ID;
  projectId: ID;
  name: string;
  order: number;
}

export interface ProjectAclView {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
  canArchive: boolean;
  canTransferOwnership: boolean;
}

export interface Project {
  id: ID;
  organizationId: ID;
  ownerId: ID;
  name: string;
  description: Nullable<string>;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  color: Nullable<string>;
  icon: Nullable<string>;
  taskCounter: number;
  slug: string;
  startDate: Nullable<ISODate>;
  dueDate: Nullable<ISODate>;
  archivedAt: Nullable<ISODate>;
  createdAt: ISODate;
  updatedAt: ISODate;
  owner: UserSummary;
  members: ProjectMember[];
  sections: TaskSection[];
  /** Present on findOne — omitted from list rows. */
  view?: ProjectAclView;
}

export interface ListProjectsQuery {
  status?: ProjectStatus;
  q?: string;
  includeArchived?: boolean;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  slug?: string;
  visibility?: ProjectVisibility;
  color?: string;
  icon?: string;
  ownerUserId?: ID;
  startDate?: string;
  dueDate?: string;
  members?: { userId: ID; role?: ProjectRole }[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  color?: string | null;
  icon?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface AddMemberInput {
  userId: ID;
  role?: ProjectRole;
}

export interface UpdateMemberRoleInput {
  role: ProjectRole;
}

export interface TransferOwnershipInput {
  newOwnerUserId: ID;
}

export interface CreateSectionInput {
  name: string;
}

export interface UpdateSectionInput {
  name?: string;
}

export interface ReorderSectionsInput {
  ids: ID[];
}

// ── Task ────────────────────────────────────────────────────────────

export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "REVIEW"
  | "DONE"
  | "CANCELLED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TaskTagSummary {
  id: ID;
  name: string;
  color: string;
  scope: Nullable<string>;
}

export interface TaskWatcherRow {
  id: ID;
  taskId: ID;
  userId: ID;
  createdAt: ISODate;
  user: UserSummary;
}

export interface TaskAclView {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canComment: boolean;
  canAssign: boolean;
  canWatch: boolean;
}

/** Shape returned from list endpoint — no subtasks or watchers details. */
export interface TaskListItem {
  id: ID;
  organizationId: ID;
  projectId: ID;
  sectionId: Nullable<ID>;
  parentTaskId: Nullable<ID>;
  code: string;
  title: string;
  description: Nullable<string>;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: Nullable<ID>;
  reporterId: ID;
  startDate: Nullable<ISODate>;
  dueDate: Nullable<ISODate>;
  estimateMinutes: Nullable<number>;
  actualMinutes: Nullable<number>;
  order: number;
  createdAt: ISODate;
  updatedAt: ISODate;
  assignee: Nullable<UserSummary>;
  reporter: UserSummary;
  section: Nullable<{ id: ID; name: string; order: number }>;
  tags: TaskTagSummary[];
  _count: { subtasks: number; watchers: number };
}

export interface TaskSubtaskRow {
  id: ID;
  code: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: Nullable<ID>;
  reporterId: ID;
  dueDate: Nullable<ISODate>;
  assignee: Nullable<UserSummary>;
  reporter: UserSummary;
}

export interface TaskDetail extends TaskListItem {
  subtasks: TaskSubtaskRow[];
  watchers: TaskWatcherRow[];
  view: TaskAclView;
}

export interface ListTasksQuery {
  projectId?: ID;
  sectionId?: ID;
  status?: TaskStatus;
  assigneeId?: ID;
  q?: string;
  includeDone?: boolean;
}

export interface CreateTaskInput {
  projectId: ID;
  title: string;
  description?: string;
  sectionId?: ID;
  parentTaskId?: ID;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: ID;
  startDate?: string;
  dueDate?: string;
  estimateMinutes?: number;
  tagIds?: ID[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  sectionId?: ID | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: ID | null;
  startDate?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
  actualMinutes?: number | null;
  tagIds?: ID[];
}

export interface ReorderTasksInput {
  ids: ID[];
}
