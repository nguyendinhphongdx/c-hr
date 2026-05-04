import type { ID, ISODate, Nullable } from "@/lib/types";

export interface DepartmentManager {
  id: ID;
  firstName: string;
  lastName: string;
}

export interface Department {
  id: ID;
  organizationId: ID;
  parentId: Nullable<ID>;
  managerId: Nullable<ID>;
  manager: Nullable<DepartmentManager>;
  name: string;
  code: Nullable<string>;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt: Nullable<ISODate>;
}

export interface CreateDepartmentInput {
  name: string;
  parentId?: ID;
  managerId?: ID;
  code?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  parentId?: Nullable<ID>;
  managerId?: Nullable<ID>;
  code?: string;
}

/** A node in the FE-built tree. parentId === null → root. */
export interface DepartmentNode extends Department {
  children: DepartmentNode[];
}
