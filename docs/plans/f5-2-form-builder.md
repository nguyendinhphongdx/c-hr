---
title: F5.2 — RequestGroup form-builder UI
description: Admin Org tự thêm/sửa group đơn (OT, OOO, WFH, …) qua drag-drop builder thay vì code release. Sửa fieldsSchema JSON.
tags: [plan, requests, admin, post-mvp]
---

# F5.2 — Form-builder UI

**Trạng thái**: 📋 chưa làm. MVP đang seed cứng 3 group `leave/checkin/checkout` qua [groups.config.ts](../../apps/backend/src/apps/requests/groups.config.ts).
**Trigger**: admin Org muốn thêm group "OT", "WFH", "Out-of-office" mà không cần code release.
**Blocked-by**: F5 ✅ done.

## Phạm vi

- Admin Org (role=admin hoặc HRM appadmin) **CRUD group custom** (create/update/disable, không xoá vì đơn đã tạo còn ref).
- 3 group system seed (`leave`, `checkin`, `checkout`) **read-only** ở UI (lock vì có side-effect handler hardcode).
- Builder fields hỗ trợ types: `text | textarea | number | date | time | enum`. Match exactly với [fields-schema.types.ts](../../apps/backend/src/apps/requests/fields-schema.types.ts).
- Side-effect cho group custom = **no-op** (chỉ create Request, không touch entity khác). Side-effect chỉ thêm qua release code (nguy hiểm nếu để FE define).

## Schema diff

`RequestGroup` hiện tại đủ. Thêm 2 field:

```prisma
model RequestGroup {
  // ... existing ...
  organizationId  String?  @map("organization_id")     // NULL = system seed (cross-Org). Non-null = Org-specific.
  isSystem        Boolean  @default(false) @map("is_system")  // true cho 3 seed → lock UI
}
```

Migration: `add_request_group_org_scope`. Backfill: 3 seed có `organizationId = NULL, isSystem = true`.

Update query: `request-group.repository.findActive(orgId)` filter `WHERE isActive AND (organizationId = $1 OR organizationId IS NULL)`.

## BE — Endpoints

```text
GET    /request-groups                              — list (system + Org's custom). Hiện đã có, mở rộng filter.
POST   /request-groups                              — admin Org tạo. Body: { code, name, description?, fieldsSchema }
PATCH  /request-groups/:id                          — admin Org sửa. Lock 3 seed (isSystem=true → 403).
PATCH  /request-groups/:id/toggle-active            — bật/tắt group. Custom only.
```

Validate khi POST/PATCH:
- `code` lowercase + dash + unique trong Org (vd `ot`, `wfh`, `home-office`). Reject nếu trùng system code (`leave/checkin/checkout`).
- `fieldsSchema` validate qua existing `request.validator.ts` (sanity check: required types, enum options non-empty, …).
- `@Auditable` cho mọi mutate.

Ngăn breaking change: PATCH `fieldsSchema` không cho **xoá field** đã có Request dùng. Check qua `WHERE data ? 'fieldKey'` (Postgres JSON contains key) — nếu có row → 400 "Field 'X' đang dùng bởi N đơn, không thể xoá. Hãy disable group thay vì xoá field."

## FE — Module layout

```text
apps/frontend/src/features/request-groups/
├── components/
│   ├── FieldsSchemaBuilder.tsx       # main builder canvas
│   ├── FieldRow.tsx                  # 1 field = 1 row, drag handle + edit + delete
│   ├── FieldEditDialog.tsx           # edit field props (label, type, required, options, …)
│   ├── FieldTypePicker.tsx           # enum dropdown 6 types
│   └── PreviewPane.tsx               # render DynamicForm preview (reuse F5)
├── hooks/
│   └── useRequestGroupAdmin.ts
├── services/
│   └── requestGroupAdminService.ts
└── views/
    ├── RequestGroupsListView.tsx     # /settings/request-groups — list system + custom
    └── RequestGroupEditView.tsx      # /settings/request-groups/:id — builder
```

UI layout split-pane:
- **Trái 60%**: list field draggable (`@dnd-kit/sortable`), button "Add field" mở `FieldEditDialog`.
- **Phải 40%**: live preview qua `<DynamicForm fieldsSchema={current} />` (component đã có từ F5).

Drag-drop reorder fields → update `fieldsSchema.fields[]` order, persist khi save.

`FieldEditDialog` props per type:
- `text/textarea`: label, key (auto from label), required, maxLength
- `number`: + min, max
- `date/time`: required, ngày-tháng helper
- `enum`: options[] với label + value, required

Validate trước save: key unique, label non-empty, enum >= 1 option.

Sidebar enable: `/settings/request-groups` chỉ admin Org thấy (`useIsAdmin()`).

## Smoke E2E

- [ ] `GET /request-groups` → 3 system seed có `isSystem: true`.
- [ ] Admin Org A `POST { code: 'ot', name: 'Tăng ca', fieldsSchema: { fields: [{key:'hours', label:'Số giờ', type:'number', required:true, min:1, max:8}] } }` → 201, audit `REQUEST_GROUP_CREATE`.
- [ ] Admin Org B `GET /request-groups` → không thấy `ot` của Org A.
- [ ] PATCH 3 system group (vd `leave`) → 403 "System group cannot be edited".
- [ ] Tạo Request với `groupId = ot` + data `{hours: 4}` → 201, validate pass.
- [ ] Tạo với `{hours: 99}` → 400 "Số giờ phải <= 8".
- [ ] Disable group `ot` (`PATCH .../toggle-active`) → user FE không thấy trong dropdown create, đơn cũ vẫn xem được.
- [ ] Sửa `ot` xoá field `hours` khi đã có request → 400 "Field 'Số giờ' đang dùng bởi 1 đơn".

## Done-when

- BE build + migration applied + audit log entries.
- Admin Org thêm group "OT" qua UI, employee tạo đơn OT, approve flow chạy như leave.
- 3 system group hiện read-only badge "Mặc định hệ thống".
- Cross-Org isolation: Org A custom group invisible cho Org B.

## Defers

- **Side-effect handler cho custom group** — vẫn no-op v1. Add admin script generator + handler registration cần code release vì security concern.
- **Conditional logic** (field A hiện khi field B = X) — defer.
- **Multi-step form** (wizard) — defer.
- **Field validation custom regex** — chỉ basic types v1.
