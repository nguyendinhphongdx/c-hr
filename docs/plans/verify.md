---
title: Pending verification — F1 + F2 runtime checks
description: Items shipped without runtime verification yet. Walk through these in a browser + Prisma Studio after `./scripts/dev.sh start:dev` + migrate + seed.
tags: [project, plan, verify]
---

# Pending verification

Backlog of things shipped through commits since 2026-05-04 that have **only**
been verified at compile time (`pnpm build` / `pnpm typecheck`). Each entry
gives the smallest set of clicks / curl calls that prove the path works
end-to-end.

> Prereqs every time:
>
> ```bash
> ./scripts/dev.sh start:dev               # postgres + redis container
> pnpm --filter @c-hr/backend prisma:migrate  # apply F1 + F2 migrations
> pnpm --filter @c-hr/backend prisma:seed     # sysowner + acme-demo Org + 2 users
> ./scripts/dev.sh dev backend             # nest start --watch :8000
> ./scripts/dev.sh dev frontend            # next dev :3000
> ```
>
> Login as `founder@acme.test` / `Demo@123456` for the Org-admin path,
> `employee@acme.test` / `Demo@123456` for the regular-user path.

## F1 — Auth + Org + AppAdmin

- [ ] **Org signup** — `/register` → fill org+admin → submit → auto-redirect
      `/home`. In Prisma Studio: 1 row in `organizations`, 1 user with
      `role=admin` and the new `organization_id`.
- [ ] **Login** — `/login` with founder creds → `/home`. Header avatar
      shows the user name.
- [ ] **/users/me** — DevTools network: GET `/api/v1/users/me` returns
      `{ ...user, organization, appAdmins }`.
- [ ] **/settings/profile** — edit `name` + `title` → Save → `me` query
      refetches, header updates.
- [ ] **/settings/security** — change password → log out → log in with
      new password.
- [ ] **/settings/organization** — admin only. Edit `name` / `timezone` /
      `currency` → Save → form persists. Try with `employee@acme.test`
      → Settings nav doesn't show this link.
- [ ] **/settings/app-admins** — admin only. Grant HRM appadmin to
      `employee@acme.test` (paste their UUID from Prisma Studio) → row
      appears in the list. `audit_logs` has 1 `APP_ADMIN_GRANT`. Revoke
      → `audit_logs` adds `APP_ADMIN_REVOKE`.
- [ ] **Org-isolation smoke** — create a 2nd Org via `/register` (logout
      first or use incognito). Try GET `/api/v1/employees` from each
      session — each only sees its own Org's data.

## F2 — Department + Employee + OrgChart

- [ ] **Migration apply** — `prisma:migrate -- --name f2_department_employee`
      runs clean and adds `departments`, `employees`, plus the new enums
      `EmployeeStatus` + `Gender`.
- [ ] **POST /departments** — as Org admin, curl/UI create
      `{ name: "Engineering" }` → 201. Then create
      `{ name: "Backend", parentId: <eng.id> }` → tree forms.
- [ ] **/departments page** — tree view shows root → children correctly.
      Empty state shows for fresh seed.
- [ ] **PATCH /departments/:id** — change parentId to a descendant of
      itself → expect 400 "would create a cycle".
- [ ] **POST /employees** — create `{ code: "EMP-0001", firstName,
      lastName, email, departmentId? }` → 201. Optional `userId`
      links + sets `User.employeeId` in same transaction (verify in
      Prisma Studio).
- [ ] **GET /employees** — paginate (limit=2&page=2 with seed +
      created rows). Search `q=alice`, status filter.
- [ ] **/employees page** — list, search, status filter, "New
      employee" button only visible to HRM appadmin or higher.
- [ ] **/employees/:id** — detail page renders all fields. Soft-deleted
      employees disappear from list.
- [ ] **DELETE /employees/:id** — soft delete (verify deleted_at set).
      Subsequent GET /employees doesn't include the row.
- [ ] **GET /orgchart/department-tree** — returns flat list filtered
      to current Org.
- [ ] **GET /orgchart/reporting-line?employeeId=** — assign a manager
      to a department, put an employee under that dept → reporting
      line returns the manager. Add a parent dept with a different
      manager → returns both, nearest-first.
- [ ] **GET /orgchart/approver-candidates?employeeId=** — `suggested`
      is the nearest manager when one exists. With no managers,
      suggested falls back to first HRM appadmin / Org admin. The
      requester is excluded from `candidates`.
- [ ] **/orgchart page** — pick employee from select → reporting
      chain renders. With no managers in tree, shows the empty-state
      copy.

## Audit log

- [ ] All `@Auditable` routes (APP_ADMIN_GRANT/REVOKE, DEPARTMENT_*,
      EMPLOYEE_*) write to `audit_logs` with the actor user id, ip,
      user-agent, and a redacted body. Failed requests do **not** write.

## Known gaps (won't fix in F2)

- React Flow visualization for OrgChart — `/orgchart` is plain HTML
  for now. Upgrade when interactive zoom/drag becomes worth the dep.
- Employee edit / soft-delete UI — service+hook in place, page not
  yet rendered.
- Department detail page (separate from tree) — same.
- Combobox employee picker for Department.managerId — currently a
  raw UUID input.
- Department filter dropdown on `/employees` — needs the picker too.
