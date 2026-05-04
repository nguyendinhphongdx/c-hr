---
title: 'ADR 0005: Backend folder structure — src/apps/<context>/<module>/'
description: Tách bounded contexts theo nghiệp vụ HR (core, hrm, attendance, requests, …) thay vì 1 thư mục modules/ phẳng.
tags: [project, adr, decision, structure, nestjs, monorepo]
---

# ADR 0005: Backend folder structure — `src/apps/<context>/<module>/`

- **Status**: Accepted
- **Date**: 2026-05-03
- **Deciders**: @nguyendinhphongdx

## Context

Boilerplate gốc đặt mọi feature module vào `src/modules/<feature>/` (auth, user, health, …). Khi C-HR thêm: `employee, department, work-schedule, attendance-log, attendance-device, leave-request, attendance-correction, app-admin, orgchart, …` → 10+ module phẳng cùng 1 thư mục, khó nắm bounded context.

C-HR là hệ thống đa-app: HRM, Attendance, Work, Tasks (sau). Mỗi app là 1 nghiệp vụ độc lập, có thể vận hành tách riêng (vd Org chỉ mua HRM, không dùng Work).

## Decision

Tổ chức theo `src/apps/<bounded-context>/<module>/`:

```text
src/
├── apps/
│   ├── core/                 # cross-cutting cho mọi app
│   │   ├── auth/             # login, register, JWT
│   │   └── user/             # CRUD User, set title, change password
│   ├── platform/             # SYS_OWNER only
│   │   └── organization/     # quản lý Org list, tạo Org cho khách hàng
│   ├── hrm/                  # bounded context HRM
│   │   ├── employee/
│   │   ├── department/
│   │   ├── orgchart/         # query tree, getManagerChain, getApproverCandidates
│   │   └── app-admin/        # gán/xóa appadmin của HRM (cũng pattern dùng cho app khác)
│   ├── attendance/           # bounded context attendance
│   │   ├── work-schedule/
│   │   ├── timesheet/        # UI calendar tháng (view của log)
│   │   ├── attendance-log/
│   │   └── attendance-device/
│   └── requests/             # đơn từ chung (workflow approval)
│       ├── leave-request/
│       └── attendance-correction/
├── common/                   # giữ nguyên (filters, guards, interceptors, dto base, decorators, …)
├── libs/                     # giữ nguyên (database, redis, mail, storage, logger)
├── config/                   # giữ nguyên
├── cli/                      # giữ nguyên
├── app.module.ts             # import HrmModule, AttendanceModule, … (1 module/context)
└── main.ts
```

### Conventions kèm theo

- Mỗi `apps/<context>/<module>/` là 1 NestJS module bình thường:
  ```text
  <module>/
  ├── <module>.module.ts
  ├── <module>.controller.ts
  ├── <module>.service.ts
  ├── <module>.repository.ts          # ADR 0001
  ├── dto/
  ├── types.ts
  └── tests/
  ```
- Mỗi `apps/<context>/` có 1 file barrel module gom các sub-module:
  ```typescript
  // src/apps/hrm/hrm.module.ts
  @Module({
    imports: [EmployeeModule, DepartmentModule, OrgChartModule, AppAdminModule],
    exports: [EmployeeModule, DepartmentModule, OrgChartModule],
  })
  export class HrmModule {}
  ```
- `app.module.ts` import 1 dòng / context: `imports: [CoreModule, PlatformModule, HrmModule, AttendanceModule, RequestsModule]`.
- Cross-context import: chỉ qua barrel (`HrmModule`) hoặc service được export. Không import sâu `apps/hrm/employee/...` từ `apps/attendance/...` — dùng public surface.

### Path alias

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@common/*": ["./common/*"],
      "@config/*": ["./config/*"],
      "@libs/*": ["./libs/*"],
      "@apps/*": ["./apps/*"]
    }
  }
}
```

(Drop `@modules/*` cũ.)

## Consequences

- **Positive**:
  - Đọc `src/apps/` thấy ngay nghiệp vụ tổ chức.
  - Tách microservice trong tương lai dễ — mỗi `apps/<context>/` là ứng cử viên.
  - Cross-context dependency rõ qua barrel — phát hiện coupling sai sớm.
  - AppAdmin per-app (HRM, WORK) có chỗ ở rõ rệt.
- **Negative**:
  - Migration từ `src/modules/{auth,user,health}` cũ → `src/apps/core/{auth,user,health}` 1 lần. Update tsconfig paths, jest moduleNameMapper, Dockerfile.
  - Subagent `module-scaffolder` cần update template path.
- **Neutral**:
  - "Nested 2 cấp" thay vì 1 cấp — không thấy độ phức tạp tăng.

## Migration plan

Trong Feature 0:
1. `git mv src/modules/auth → src/apps/core/auth` (giữ history).
2. `git mv src/modules/user → src/apps/core/user`.
3. `git mv src/modules/health → src/apps/core/health`.
4. Tạo `src/apps/core/core.module.ts` re-export.
5. Update `src/app.module.ts` imports.
6. Update `tsconfig.json` paths (drop `@modules/*`, add `@apps/*`).
7. Update `package.json` jest config `moduleNameMapper`.
8. `pnpm build` xanh.

## Alternatives considered

- **Option A (rejected): giữ `src/modules/` phẳng**
  - 10+ module cùng 1 chỗ → khó nắm.
- **Option B (rejected): pnpm workspace package per-app** (`packages/hrm`, `packages/attendance`)
  - Quá sớm — overhead build/share types lớn. Re-evaluate khi tách microservice.

## References

- [ADR 0003](0003-no-permission-engine.md) — `AppCode` enum (HRM, WORK, …) khớp 1-1 với folder `src/apps/`.
- [src/app.module.ts](../../apps/backend/src/app.module.ts) — composition root.
