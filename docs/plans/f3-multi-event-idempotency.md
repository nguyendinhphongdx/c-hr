---
title: F3 — Multi-event push idempotency fix
description: Tách bảng attendance_events raw, aggregate sang attendance_logs để replay IN+OUT cùng ngày trả counter đúng.
tags: [plan, attendance, idempotency, fix]
---

# F3 — Multi-event push idempotency

**Trạng thái**: 📋 edge bug, non-blocking. Ghi nhận trong [features.md §F3 edge findings](features.md#edge-findings-non-blocking-ghi-chú-để-fix-sau).
**Trigger**: trước khi vào prod thật với thiết bị push 2 event/ngày (IN + OUT).
**Blocked-by**: F3 ✅ done.

## Vấn đề hiện tại

Bảng `attendance_logs` chỉ store **1** `event_log_id` per `(employee, date)` row. Khi push IN+OUT cùng 1 ngày trong 1 request:
- Event đầu (IN) tracked → row tạo với `event_log_id = evt-IN`.
- Event sau (OUT) update `check_out_at` nhưng `event_log_id` vẫn = `evt-IN`.

Replay request cũ:
- IN replay → match `(deviceId, evt-IN)` unique → counter `duplicates += 1`.
- OUT replay → KHÔNG match (vì `event_log_id` row không phải `evt-OUT`) → counter `accepted += 1` thay vì `duplicates += 1`.

Không phá data (row không dup, range timestamps merge OK). Nhưng counter lệch → ZK-bridge nhận "accepted" sai → có thể retry vô hạn nếu logic dựa counter.

## Fix — tách `attendance_events` raw

### Schema diff

```prisma
enum AttendanceEventType { IN OUT }

/// Raw event từ device, append-only. Aggregate qua trigger / service sang attendance_logs.
model AttendanceEvent {
  id              String              @id @default(uuid())
  organizationId  String              @map("organization_id")
  deviceId        String?             @map("device_id")
  eventLogId      String              @map("event_log_id")    // device-side ID
  employeeId      String              @map("employee_id")
  type            AttendanceEventType
  timestamp       DateTime
  rawPayload      Json?               @map("raw_payload")     // tuỳ chọn cho debug
  createdAt       DateTime            @default(now()) @map("created_at")

  @@unique([deviceId, eventLogId])              // idempotent thật, mỗi event 1 row
  @@index([organizationId, employeeId, timestamp])
  @@map("attendance_events")
}

model AttendanceLog {
  // ... fields hiện có ...
  // BỎ: eventLogId, @@unique([deviceId, eventLogId])
  // GIỮ: @@unique([employeeId, date])
}
```

Migration: `f3_split_attendance_events`. Backfill: với mỗi row `attendance_logs` hiện tại có `event_log_id`, insert 1 row `attendance_events` (type derive từ checkInAt/checkOutAt — fragile, OK vì hiện DB dev còn ít data).

### Service logic mới

`attendance-device.service.push(payload)`:

```ts
async push({ events, deviceId, organizationId }) {
  let accepted = 0, duplicates = 0;
  for (const e of events) {
    try {
      await this.eventRepo.create({
        deviceId, eventLogId: e.eventLogId, employeeId, type: e.type, timestamp: e.timestamp,
      });
      accepted++;
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        duplicates++;
        continue;
      }
      throw err;
    }
    // Aggregate sang attendance_logs
    await this.aggregateToLog(employeeId, dateOf(e.timestamp), organizationId);
  }
  return { accepted, duplicates };
}

async aggregateToLog(employeeId, date, organizationId) {
  const events = await this.eventRepo.findByEmployeeDay(employeeId, date);
  const checkInAt = min(events.filter(e => e.type === 'IN').map(e => e.timestamp));
  const checkOutAt = max(events.filter(e => e.type === 'OUT').map(e => e.timestamp));
  await this.logRepo.upsert({ employeeId, date }, { checkInAt, checkOutAt, source: 'DEVICE', organizationId });
}
```

### Done-when

- Schema migration applied + backfill clean.
- BE build xanh.
- Smoke replay 2-event request → `accepted: 0, duplicates: 2`.
- Single 1-event request → `accepted: 1` lần đầu, `duplicates: 1` replay (giữ behavior cũ).
- `/timesheet` render checkInAt + checkOutAt như cũ (aggregate đúng).

## Smoke E2E

- [ ] Push `[{IN, evt-1, 08:00}, {OUT, evt-2, 17:00}]` → 2 `attendance_events` rows + 1 `attendance_logs` row với both timestamps.
- [ ] Replay cùng request → `accepted: 0, duplicates: 2`. Row count vẫn 2 + 1.
- [ ] Push thêm `[{OUT, evt-3, 18:00}]` (cập nhật giờ về sau) → 1 event mới, log `checkOutAt` update sang 18:00 (max).
- [ ] Push `[{IN, evt-4, 07:30}]` (cập nhật giờ về trước) → log `checkInAt` update sang 07:30 (min).
- [ ] Cross-device cùng employee/day: ZK-001 push IN, Hik-002 push OUT → log có cả 2 timestamps.

## Risks

- Backfill phức tạp nếu prod đã có nhiều data dirty (vd `event_log_id` NULL vì manual correction). Khuyến nghị: chạy fix này **trước** khi onboard khách hàng đầu tiên.
- Performance: aggregate query mỗi push event O(events/day). Với 5k employee × 2 event/day = 10k push/sáng — vẫn OK với index `(organizationId, employeeId, timestamp)`. Khi >100k event/ngày cân nhắc trigger PG materialized.

## Defers

- **Trigger PG aggregate** thay service-level aggregate — perf optimization khi scale.
- **Multiple IN/OUT pairs/day** (vd ra ngoài rồi quay lại) — hiện chỉ track first IN + last OUT. Add `breakIntervals: Json` field nếu cần.
