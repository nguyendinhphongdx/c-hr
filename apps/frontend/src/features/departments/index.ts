export { DepartmentCreateView } from "./views/DepartmentCreateView";
export { DepartmentTreeView } from "./views/DepartmentTreeView";
export {
  departmentsKeys,
  useCreateDepartment,
  useDeleteDepartment,
  useDepartment,
  useDepartments,
  useDepartmentTree,
  useUpdateDepartment,
} from "./hooks/useDepartments";
export { departmentsService } from "./services/departmentsService";
export type {
  CreateDepartmentInput,
  Department,
  DepartmentNode,
  UpdateDepartmentInput,
} from "./types";
