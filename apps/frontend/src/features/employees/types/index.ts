import type { ID, ISODate, Nullable } from "@/lib/types";

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type Role = "sysowner" | "admin" | "user";

export interface EmployeeUser {
  id: ID;
  email: string;
  name: Nullable<string>;
  avatar: Nullable<string>;
  dob: Nullable<ISODate>;
  gender: Nullable<Gender>;
  phone: Nullable<string>;
  role: Role;
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
 * "Add staff" — two modes (mutually exclusive):
 *  - Provide `userId` to link an existing User (e.g. founder who
 *    self-registered). Email/name/password are ignored.
 *  - Otherwise provide `email + name + password` to create a fresh User
 *    atomically with the Employee.
 */
export interface CreateEmployeeInput {
  code: string;
  userId?: ID;
  email?: string;
  name?: string;
  password?: string;
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

export type ImportRowStatus = "valid" | "invalid";

export interface ParsedEmployeeRow {
  rowNumber: number;
  employeeCode: string;
  email: string;
  name: string;
  title: Nullable<string>;
  status: ImportRowStatus;
  errors: string[];
}

export interface EmployeeImportParseResponse {
  rows: ParsedEmployeeRow[];
  summary: { total: number; valid: number; invalid: number };
}

export interface EmployeeImportBulkInput {
  defaultPassword: string;
  rows: { employeeCode: string; email: string; name: string; title?: string }[];
}

export interface EmployeeImportBulkResponse {
  created: number;
  failed: { rowNumber: Nullable<number>; email: string; reason: string }[];
}
