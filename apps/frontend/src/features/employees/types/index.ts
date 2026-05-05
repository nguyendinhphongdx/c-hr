import type { ID, ISODate, Nullable } from "@/lib/types";

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface EmployeeUser {
  id: ID;
  email: string;
  name: Nullable<string>;
  avatar: Nullable<string>;
  dob: Nullable<ISODate>;
  gender: Nullable<Gender>;
  phone: Nullable<string>;
}

export interface Employee {
  id: ID;
  organizationId: ID;
  departmentId: Nullable<ID>;
  /** Linked User — personal info source of truth (name, email, dob, ...). */
  user: Nullable<EmployeeUser>;
  code: string;
  /** Formal job title set by HR. Distinct from User.title (personal). */
  title: Nullable<string>;
  hireDate: Nullable<ISODate>;
  terminationDate: Nullable<ISODate>;
  status: EmployeeStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt: Nullable<ISODate>;
}

export interface EmployeesListQuery {
  departmentId?: ID;
  status?: EmployeeStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export interface EmployeesListResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Atomic "Add staff" — creating an Employee always provisions a fresh
 * User row. Email + name + password are required (User fields); the rest
 * is HR-side metadata. To link an *existing* User instead, use the edit
 * form's user re-link flow.
 */
export interface CreateEmployeeInput {
  email: string;
  name: string;
  password: string;
  code: string;
  departmentId?: ID;
  title?: string;
  hireDate?: string;
}

export interface UpdateEmployeeInput {
  userId?: ID;
  departmentId?: Nullable<ID>;
  title?: Nullable<string>;
  hireDate?: Nullable<string>;
  terminationDate?: Nullable<string>;
  status?: EmployeeStatus;
}
