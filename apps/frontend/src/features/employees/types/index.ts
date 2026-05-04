import type { ID, ISODate, Nullable } from "@/lib/types";

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Employee {
  id: ID;
  organizationId: ID;
  departmentId: Nullable<ID>;
  code: string;
  firstName: string;
  lastName: string;
  dob: Nullable<ISODate>;
  gender: Nullable<Gender>;
  phone: Nullable<string>;
  email: string;
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

export interface CreateEmployeeInput {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  userId?: ID;
  departmentId?: ID;
  dob?: string;
  gender?: Gender;
  phone?: string;
  title?: string;
  hireDate?: string;
}

export interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  departmentId?: Nullable<ID>;
  dob?: Nullable<string>;
  gender?: Nullable<Gender>;
  phone?: Nullable<string>;
  title?: Nullable<string>;
  hireDate?: Nullable<string>;
  terminationDate?: Nullable<string>;
  status?: EmployeeStatus;
}
