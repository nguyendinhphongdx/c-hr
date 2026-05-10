---
title: F6.6 — Activity feed dashboard cho HRM appadmin
description: Trang /activities cho HR xem stream toàn Org filter theo action / user / time range. Tận dụng index có sẵn.
tags: [plan, collaboration, dashboard, admin]
---

# F6.6 — Activity feed dashboard

**Trạng thái**: 📋 chưa làm. Activity log đã có từ F6, index `(organizationId, createdAt DESC)` có sẵn.
**Trigger**: HR muốn xem nhanh "Hôm qua công ty làm gì" mà không click vào từng record.
**Blocked-by**: F6 ✅ done.

## BE deliverables

Endpoint mới (mở rộng activity controller):

```text
GET /activities?action=&userId=&objectType=&from=&to=&cursor=&limit=50
```

- Auth: chỉ HRM appadmin (admin Org tự pass) — `isAppAdmin(user, 'HRM', orgId)`.
- Tenant: filter `organizationId`.
- Filter:
  - `action` exact hoặc prefix (`request.*`, `event.*`).
  - `userId` actor.
  - `objectType` enum.
  - `from/to` ISO date.
- Cursor pagination by `(createdAt DESC, id DESC)`. Trả `nextCursor`.
- Joins: load user (actor) + load object label (lazy — qua `objectLabel` snapshot field, không join target table).
- Index `(organizationId, createdAt DESC)` đủ. Nếu filter action nặng → thêm `(organizationId, action, createdAt DESC)` migration.

Aggregation endpoint cho dashboard chart:

```text
GET /activities/stats?from=&to=&groupBy=action|userId|objectType
```

→ `[{ key: 'request.created', count: 42 }, ...]` cho bar chart.

## FE deliverables

```text
apps/frontend/src/features/activities/
├── components/
│   ├── ActivityFiltersBar.tsx        # date range + action multi-select + user picker
│   ├── ActivityRow.tsx               # 1 hoạt động — icon + actor + verb + object link + time
│   └── ActivityStatsChart.tsx        # bar chart (recharts) qua /stats endpoint
├── hooks/
│   ├── useActivities.ts              # infinite query với cursor
│   └── useActivityStats.ts
├── services/
│   └── activityService.ts
└── views/
    └── ActivitiesView.tsx            # /activities — top: stats chart, dưới: filtered feed
```

UI layout:
- **Top**: 3 KPI tile (total today / yesterday / 7d) + bar chart per-day.
- **Filters bar**: date range (default 7 ngày), action prefix dropdown (`request.*`, `event.*`, `comment.*`, …), user picker.
- **Feed**: infinite scroll list, mỗi row:
  ```
  [avatar] Tuấn đã duyệt đơn nghỉ phép của Nam · 5 phút trước · /requests/abc
  ```
- Click row → deep link object (qua `routeFor(objectType, objectId)` helper).

Sidebar nav: thêm "Hoạt động" trong group "Quản lý" (chỉ HRM appadmin thấy qua `useIsAppAdmin('HRM')`).

## Smoke E2E

- [ ] HR User C `GET /activities` → trả 50 entries gần nhất, filter Org C.
- [ ] User thường (không HR) `GET /activities` → 403.
- [ ] Filter `action=request.approved&from=2026-05-01` → trả đúng subset.
- [ ] Cursor pagination → page 2 không trùng page 1.
- [ ] `/activities/stats?groupBy=action` → bar chart render đúng.
- [ ] Click row trong feed → mở `/requests/abc` đúng record.

## Done-when

- BE build xanh, swagger có 2 endpoint.
- FE check xanh, route `/activities` reachable cho HR appadmin.
- Filter + pagination + chart hoạt động.
- Cross-Org isolation verified.

## Defers

- **Real-time feed** (WebSocket push activity mới) — [roadmap.md F7.7](roadmap.md#f77).
- **Export feed CSV/XLSX** — defer (HR có thể query DB trực tiếp khi cần).
- **Saved filter presets** ("Đơn tuần này", "Comment hôm qua") — defer.
- **Activity heatmap** (calendar-style hot/cold) — defer, defer cho khi data nhiều.
