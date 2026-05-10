---
title: F7 — Event recurrence (RRULE)
description: Event lặp daily/weekly/monthly với RFC 5545 RRULE. Schema thêm 2 field, expand instances trong query range, override single instance qua parent-child.
tags: [plan, calendar, recurrence, post-mvp]
---

# F7 — Recurrence

**Trạng thái**: 📋 chưa làm. Schema [comment line 460](../../apps/backend/prisma/schema.prisma) ghi rõ "MVP: single events only".
**Trigger**: user có meeting weekly/standup/monthly review.
**Blocked-by**: F7.1 ✅ done.

## Schema diff

```prisma
model Event {
  // ... fields hiện có ...

  /// RFC 5545 RRULE string (vd "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231T235959Z")
  /// NULL = single event.
  recurrenceRule  String?  @map("recurrence_rule")

  /// Master event ID. NULL nếu là master (hoặc chính nó). Set khi là override row của 1 instance trong series.
  parentEventId   String?  @map("parent_event_id")
  parent          Event?   @relation("EventOverrides", fields: [parentEventId], references: [id], onDelete: Cascade)
  overrides       Event[]  @relation("EventOverrides")

  /// Khi là override, lưu thời điểm gốc của instance bị override (so với master.startAt + RRULE).
  /// NULL nếu master hoặc single.
  recurrenceOriginalStart DateTime? @map("recurrence_original_start")

  @@index([parentEventId, recurrenceOriginalStart])
}
```

Migration: `add_event_recurrence`.

## BE — Logic

Deps mới: `rrule` npm.

### `event.service.list({ from, to, ... })` mở rộng

```ts
// 1. Query tất cả master + single trong range, plus master có recurrence overlap range
const masters = await this.repo.findMastersInRange({ from, to });

// 2. Query tất cả overrides của các master này
const overrides = await this.repo.findOverridesByParentIds(masters.map(m => m.id));
const overrideMap = groupBy(overrides, o => `${o.parentEventId}|${o.recurrenceOriginalStart.toISOString()}`);

// 3. Expand instances
const instances: Event[] = [];
for (const master of masters) {
  if (!master.recurrenceRule) {
    instances.push(master); // single
    continue;
  }
  const rule = RRule.fromString(`DTSTART:${formatRRuleDate(master.startAt)}\n${master.recurrenceRule}`);
  const dates = rule.between(from, to, true); // inclusive
  const duration = master.endAt.getTime() - master.startAt.getTime();
  for (const date of dates) {
    const key = `${master.id}|${date.toISOString()}`;
    const override = overrideMap[key]?.[0];
    if (override?.deletedAt) continue; // instance bị xoá
    if (override) {
      instances.push(override); // dùng override thay master
    } else {
      // virtual instance: clone master + adjust startAt/endAt
      instances.push({
        ...master,
        id: `${master.id}#${date.toISOString()}`,  // virtual ID, FE phân biệt qua "#"
        startAt: date,
        endAt: new Date(date.getTime() + duration),
        isVirtualInstance: true,                    // BE field, không persist
      });
    }
  }
}
return instances;
```

### `event.service.update(id, dto, { scope: 'instance' | 'series' })`

- `scope: 'series'` (default): update master row. Tất cả future instances follow.
- `scope: 'instance'`: nếu `id` là virtual ID (chứa `#`):
  1. Parse `parentId, originalStart` từ virtual ID.
  2. Tạo row mới `parentEventId = parentId, recurrenceOriginalStart = originalStart` + fields từ dto.
- Nếu `id` là override hiện hữu → update row đó.

### `event.service.remove(id, { scope })`

- `scope: 'series'`: soft-delete master + cascade overrides (Prisma onDelete).
- `scope: 'instance'`: tạo override với `deletedAt = now()` để loại instance này khỏi expand.

### `recurrence.ts` — helper module

```ts
export function expandInstances(master, from, to): Event[];
export function parseVirtualId(id: string): { parentId, originalStart } | null;
export function buildVirtualId(parentId, originalStart): string;
export function validateRRule(rrule: string): void;  // throws on invalid
```

## FE deliverables

- `components/event/RecurrencePicker.tsx`:
  - Preset: "Không lặp", "Hằng ngày", "Hằng tuần (T2,T4,T6)", "Hằng tuần (cùng ngày)", "Hằng tháng (cùng ngày)", "Tùy chỉnh".
  - "Tùy chỉnh" mở popover: FREQ + INTERVAL + BYDAY checkbox + UNTIL date picker.
  - Output: RRULE string.
- `EventCreateDialog.tsx` thêm `<RecurrencePicker />` dưới time fields.
- `EventDetailDialog.tsx`:
  - Khi click virtual instance → modal "Chỉnh sửa sự kiện này / Tất cả sự kiện trong series" trước khi mở form.
  - Delete cũng có 2 option giống Google Calendar.
- `EventChip.tsx` thêm icon recurrence (🔁) cho instances của series.

## Smoke E2E

- [ ] `POST /events { recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=4' }` → 1 master row.
- [ ] `GET /events/range?from=&to=` 4 tuần → trả 4 virtual instances (id chứa `#`).
- [ ] `PATCH /events/<virtualId>?scope=instance { title: 'Đổi riêng tuần này' }` → tạo override row.
- [ ] `GET /events/range` lần sau → 3 instances virtual + 1 từ override với title mới.
- [ ] `DELETE /events/<virtualId>?scope=instance` → tạo override `deletedAt`, expand bỏ instance đó.
- [ ] `PATCH /events/<masterId>?scope=series { title: 'Title mới cho cả series' }` → master title update, virtual instances refl.
- [ ] `DELETE /events/<masterId>?scope=series` → master + tất cả overrides soft-delete.
- [ ] Invalid RRULE string → 400 với message rõ ràng.

## Done-when

- BE build xanh, migration applied.
- FE check xanh, EventCreateDialog có RecurrencePicker, detail dialog hỏi instance vs series.
- Tạo meeting weekly Mon/Wed/Fri × 4 tuần → render đúng 12 instance trên `/bookings` 4 view.

## Defers

- **F7.10 — Recurring exceptions UX** "this event vs this and following vs all" (Google pattern). Hiện chỉ 2 option (instance/series). Xem [roadmap.md](roadmap.md#f710).
- **EXDATE / RDATE** (RFC 5545 advanced) — chỉ RRULE đơn giản v1.
- **Conflict check** trên virtual instances — defer (perf concern khi expand × N tuần).
- **External sync** (F7.4) sync recurrence từ Google: cần map RRULE format Google ↔ RFC 5545. Defer cho F7.4 phase sau.
