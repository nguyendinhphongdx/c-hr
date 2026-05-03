---
title: 'ADR 0004: OrgChart source of truth — Department.managerId + parentDepartmentId'
description: Department tree là single source. Manager chain query qua Postgres recursive CTE. Employee không có directManagerId.
tags: [project, adr, decision, orgchart, department, hrm]
---

# ADR 0004: OrgChart source of truth — `Department.managerId` + `parentDepartmentId`

- **Status**: Accepted
- **Date**: 2026-05-03
- **Deciders**: @nguyendinhphongdx

## Context

Cần biết "ai là quản lý của nhân viên X" để:
- Auto suggest approver khi X tạo đơn (leave, attendance correction).
- Hiển thị OrgChart bằng React Flow.
- Lookup chuỗi cấp trên ("manager-of-manager", up to root).

Có 2 cách model:

1. **`Employee.directManagerId?` self-reference**: mỗi nhân viên chỉ vào 1 manager. Dễ query 1-cấp, scale ngang dễ. Nhưng phải maintain riêng khỏi Department tree → 2 cây cùng tồn tại.
2. **`Department.parentDepartmentId` + `Department.managerId`**: organize qua phòng ban. Mọi nhân viên thuộc 1 phòng, manager phòng cha là manager của nhân viên (đệ quy lên). 1 cây duy nhất.

## Decision

**Cách 2** — Department là single source of truth cho orgchart.

```prisma
model Department {
  id                  String       @id @default(uuid())
  organizationId      String
  parentDepartmentId  String?      // nested tree, null = top-level
  managerId           String?      // → Employee
  name                String
  code                String?

  parent              Department?  @relation("DeptTree", fields: [parentDepartmentId], references: [id])
  children            Department[] @relation("DeptTree")
  manager             Employee?    @relation("DeptManager", fields: [managerId], references: [id])
  members             Employee[]

  @@unique([organizationId, code])
  @@map("departments")
}

model Employee {
  id              String      @id @default(uuid())
  organizationId  String
  departmentId    String?           // CHỈ field này (KHÔNG có directManagerId)
  // ...
  @@map("employees")
}
```

### Logic suy ra "quản lý của X"

```text
1. Lấy department D = X.department.
2. Nếu D.manager tồn tại VÀ D.manager.id ≠ X.id → đó là quản lý gần nhất.
3. Nếu D.manager == X (X là manager phòng D) HOẶC D.manager == null → walk up parent.
4. Lặp đến root, gom được chain quản lý.
```

### Truy vấn — Postgres recursive CTE (1 query, không N+1)

```sql
WITH RECURSIVE manager_chain AS (
  SELECT d.id, d.parent_department_id, d.manager_id, 0 AS depth
  FROM departments d
  WHERE d.id = (SELECT department_id FROM employees WHERE id = $1)

  UNION ALL

  SELECT d.id, d.parent_department_id, d.manager_id, mc.depth + 1
  FROM departments d
  JOIN manager_chain mc ON d.id = mc.parent_department_id
)
SELECT e.*
FROM manager_chain mc
JOIN employees e ON e.id = mc.manager_id
WHERE e.id <> $1                  -- bỏ chính X (trường hợp X là manager phòng mình)
ORDER BY mc.depth;
```

Service `OrgChartService` expose:
- `getManagerChain(employeeId): Employee[]` — chuỗi từ gần đến gốc.
- `getNearestManager(employeeId): Employee | null`.
- `getDirectReports(managerId): Employee[]` — thành viên các phòng managerId đang quản (loại trừ chính managerId).
- `getApproverCandidates(employeeId): { suggested, candidates[] }` — manager chain ∪ HRM appAdmins.
- `getOrgTree(orgId): TreeNode` — toàn bộ cây cho React Flow.

### Cache

Redis key `orgchart:chain:${employeeId}`, TTL 1 giờ. Invalidate qua EventEmitter khi:
- Update `Employee.departmentId`
- Update `Department.managerId`
- Update `Department.parentDepartmentId`

## Consequences

- **Positive**:
  - 1 cây duy nhất cho tổ chức — không có 2 nguồn truth conflicting.
  - Reorganize: di chuyển 1 phòng = đổi `parentDepartmentId` 1 lần, không phải bulk update từng `Employee.directManagerId`.
  - Approver auto-suggest đúng theo cây.
  - React Flow vẽ trực tiếp từ Department list.
- **Negative**:
  - Chuỗi quản lý phải query đệ quy → cần CTE (Postgres native, OK). Nếu sau này đổi DB engine → cần adapt query.
  - Edge case: nhân viên không thuộc phòng nào (`departmentId = null`) → không có manager. **Quy định**: mọi employee bắt buộc thuộc 1 department (kể cả CEO thuộc "Ban giám đốc").
- **Neutral**:
  - Manager chain max depth phụ thuộc tổ chức. Limit 20 cấp trong CTE để tránh runaway.

## Edge cases & policy

| Case | Xử lý |
|---|---|
| X thuộc dept không có manager | Walk up parent dept. |
| X chính là manager dept mình | Bỏ qua self, walk up parent. |
| X ở dept root + chính là manager dept đó (CEO) | `getNearestManager` trả null. `getApproverCandidates` fallback HRM appAdmins; UI cho user chọn (có thể chọn chính mình → vẫn flow approve thường, không auto). |
| Cycle (A.dept.parent → ... → A.dept) | Validate ở service trước khi `setDepartmentParent`/`setDepartmentManager` — walk + reject nếu gặp cycle. |
| Manager terminate | Trigger event `employee.terminated` → batch update các `Department.managerId == terminatedId` → set null. Pending requests có `approverId == terminatedId` → re-route lên `getNearestManager` của requester (sau khi đổi). |

## Alternatives considered

- **Option A (rejected): `Employee.directManagerId`**
  - Đơn giản hơn cho query 1 cấp.
  - Nhược: 2 nguồn truth (employee.directManager + department.manager) — bulk update khi tái cấu trúc.
- **Option B (considered, defer): Matrix org (N-N managers)**
  - Bảng `employee_managers` với type PRIMARY/FUNCTIONAL/DOTTED_LINE.
  - Chưa cần MVP. Mở khi có khách yêu cầu.

## References

- [ADR 0003](0003-no-permission-engine.md) — code if/else dùng orgchart query để check ownership.
- Postgres docs: [WITH RECURSIVE](https://www.postgresql.org/docs/current/queries-with.html)
