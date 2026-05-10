---
title: F7.4 — External calendar sync (Google + Microsoft, 1-way pull)
description: OAuth connect + cron pull lịch external về overlay vào C-HR. Phase cuối F7. 1 model + 2 service provider + scheduler + 4 endpoint OAuth.
tags: [plan, calendar, integration, oauth, post-mvp]
---

# F7.4 — External calendar sync

**Trạng thái**: 📋 chưa làm. Là phase cuối còn thiếu của F7.
**Trigger**: user thật cần overlay lịch Google/Outlook lên C-HR. Không làm trước khi user yêu cầu.
**Blocked-by**: F7.1 (event schema) ✅ done.
**Decision D6** (đã chốt từ [features.md §F7](features.md#feature-7--calendar--booking)): 1-way pull v1, 2-way push deferred → [f7-6-2way-sync.md](roadmap.md#f76).

## Schema (1 bảng + 1 enum)

```prisma
enum ExternalProvider { GOOGLE MICROSOFT }

model ExternalCalendarLink {
  id              String           @id @default(uuid())
  userId          String           @map("user_id")
  provider        ExternalProvider
  externalUserId  String           @map("external_user_id")    // sub claim từ OAuth
  /// Encrypted at rest qua libs/crypto (cùng pattern token AttendanceDevice).
  accessToken     String           @db.Text @map("access_token")
  refreshToken    String?          @db.Text @map("refresh_token")
  expiresAt       DateTime?        @map("expires_at")
  /// Cursor cho incremental sync — Google: syncToken; Microsoft: deltaLink.
  syncToken       String?          @db.Text @map("sync_token")
  lastSyncedAt    DateTime?        @map("last_synced_at")
  isActive        Boolean          @default(true) @map("is_active")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt      @map("updated_at")
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, provider])
  @@index([provider, isActive, lastSyncedAt])
  @@map("external_calendar_links")
}
```

Migration: `add_external_calendar_links`. Không touch bảng khác.

Cộng `Event` đã có `externalId` + `externalProvider` (đã thêm trong migration `add_calendar_events`) — pulled events lưu chung table với local events, phân biệt qua 2 field này.

## BE — Module layout

```text
apps/backend/src/apps/calendar/external-sync/
├── external-sync.module.ts
├── external-link.service.ts          # CRUD ExternalCalendarLink
├── external-link.repository.ts
├── external-link.controller.ts       # /calendar-links/* endpoints
├── google.service.ts                 # googleapis client wrap
├── microsoft.service.ts              # @microsoft/microsoft-graph-client wrap
├── sync.scheduler.ts                 # @Cron('*/5 * * * *') incremental sync
├── token-encrypt.ts                  # reuse libs/crypto
└── dto/
    ├── connect-callback.dto.ts
    └── index.ts
```

Deps mới (BE): `googleapis`, `@microsoft/microsoft-graph-client` + `@azure/msal-node`. Lazy load (tránh bloat default bundle).

Env mới: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, tương tự cho `MICROSOFT_*`. Add vào `.env.example` BE.

## BE — Endpoints

```text
GET    /calendar-links                                 — list provider đã connect của user
POST   /calendar-links/google/connect                  — return OAuth authorize URL
GET    /calendar-links/google/callback?code=&state=    — exchange code, lưu token
POST   /calendar-links/google/sync                     — manual trigger sync ngay
DELETE /calendar-links/:provider                       — disconnect + soft-delete pulled events (where externalProvider matches)

# Microsoft tương tự
POST   /calendar-links/microsoft/connect
GET    /calendar-links/microsoft/callback
POST   /calendar-links/microsoft/sync
```

Auth: tất cả require login (user-scoped, không phải Org-scoped — mỗi user connect tài khoản cá nhân của mình).

State token (CSRF): generate khi `/connect`, lưu Redis TTL 10 phút, verify ở `/callback`.

## BE — Sync logic

`SyncScheduler.@Cron('0 */5 * * * *')` — mỗi 5 phút:

1. `findActiveLinks({ lastSyncedAtBefore: now() - 5min })` → list cần refresh.
2. Per link: refresh access token nếu `expiresAt < now()` (qua `refreshToken`).
3. Call provider API với `syncToken` (Google) hoặc `deltaLink` (Microsoft) → trả delta events.
4. Upsert events: match `(externalProvider, externalId)` unique. Nếu remote deleted → soft-delete local row. Nếu cancel/decline → update status.
5. Update `link.syncToken`, `link.lastSyncedAt`.
6. Catch error per-link, log, không fail toàn bộ batch.

`Event.ownerId` cho pulled events = `Employee` link với `User` đang connect (qua `User.employeeId`). Nếu user chưa link Employee → skip pulled events (UI báo "Cần link Employee trước khi sync").

## FE deliverables

- `features/calendar/components/shell/CalendarSidebar.tsx` mở rộng:
  - Section "Lịch từ Google" (đã có UI placeholder) → enable connect button.
  - Connect button → call `/calendar-links/google/connect` → window.open(authUrl).
  - Sau callback → close popup, invalidate `useExternalLinks` query.
  - Toggle checkbox bật/tắt overlay events từ provider trên main calendar.
- `features/calendar/services/externalSyncService.ts` — CRUD link.
- `features/calendar/hooks/useExternalLinks.ts` — TanStack Query.
- Pulled events render với `externalProvider` badge (Google/Microsoft logo nhỏ ở góc).

## Smoke E2E

- [ ] User chưa connect → `GET /calendar-links` trả `[]`.
- [ ] `POST /calendar-links/google/connect` → trả `{ authorizeUrl }` chứa client ID + state.
- [ ] Manual: mở authorizeUrl → grant → callback → link row created với token encrypted.
- [ ] `POST /calendar-links/google/sync` → events pull về với `externalProvider: 'GOOGLE'` + `externalId`.
- [ ] Sync lần 2 dùng `syncToken` → chỉ delta (không pull lại all).
- [ ] `DELETE /calendar-links/google` → link row deleted, events `WHERE externalProvider='GOOGLE'` soft-deleted.
- [ ] `/bookings` overlay events Google + local cùng grid, đúng màu provider.
- [ ] User token expired → scheduler refresh transparent, sync vẫn chạy.

## Done-when

- BE build xanh, migration applied, swagger có 4 endpoint OAuth + sync.
- FE check xanh, sidebar Lịch từ Google/Microsoft enable connect button thật.
- Connect → grant → events Google hiện trên `/bookings` trong < 5 phút.
- Disconnect → events biến mất, link row deleted.

## Defers (F7.4.x)

- **Conflict policy** khi user edit event đã pulled từ Google: hiện block edit (read-only). 2-way push xem [roadmap.md F7.6](roadmap.md#f76).
- **iCloud / generic CalDAV** — chỉ Google + Microsoft v1.
- **Per-Org service account** cho org muốn sync calendar dùng chung (vd lễ tết) — defer.
- **Webhook / push notification** từ Google thay polling — perf optimization, defer.

## Risks

- OAuth redirect URI cần khớp app config production — test ở staging trước. Nếu C-HR self-hosted, khách hàng phải tự register OAuth app riêng (document trong runbook).
- Token refresh fail → user phải reconnect manual. UI hiện trạng "Cần kết nối lại" khi refresh fail 3 lần liên tiếp.
- Rate limit: Google 1M queries/day free tier; Microsoft Graph 10k requests/10s/app. Cron 5 phút × N user → cần monitor.
