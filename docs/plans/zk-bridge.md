---
title: ZK-Bridge — pull-side adapter for ZKTeco / Hikvision attendance devices
description: Sống trong monorepo (services/zk-bridge), nhưng *deploy tách rời* tại LAN văn phòng khách hàng. Polls device qua TCP/SDK, dịch sang generic JSON contract, push vào C-HR backend ở cloud.
tags: [project, plan, attendance, integration, deployment, post-mvp]
---

# ZK-Bridge

> **Trạng thái**: Defer sang sau khi F1–F5 đóng + có khách hàng thật cần tích hợp device. Trước đó **không** code.
>
> **Vị trí**: `services/zk-bridge/` (monorepo) nhưng deploy **độc lập** tại văn phòng khách hàng — không chạy cùng C-HR backend.

## Vì sao cần

ZKTeco (và phần lớn đầu đọc đời cũ) **không hỗ trợ HTTP webhook**. Driver tích hợp dùng TCP socket qua SDK (`node-zklib` / Hikvision ISAPI / Suprema BioStar). C-HR design hiện tại chỉ chấp nhận push qua `POST /api/v1/attendance-devices/push` (xem [F3 trong features.md](features.md)). Khoảng trống này được lấp bằng **bridge**:

```
[ZKTeco device, LAN 192.168.x.x:4370]
         ▲ TCP poll mỗi 5 phút
         │  (chỉ reach được trong LAN)
[zk-bridge — chạy trong LAN]
         │
         ▼ HTTPS POST (Internet)
[C-HR backend — cloud]
         │
         ▼ /api/v1/attendance-devices/push
[attendance_logs]
```

Bridge **bắt buộc** phải chạy ở môi trường nhìn thấy device — tức cùng LAN văn phòng khách hàng. C-HR backend ở cloud không reach được `192.168.1.201:4370` trực tiếp.

## Tại sao trong monorepo nhưng deploy tách rời

**Trong monorepo (`services/zk-bridge/`)** vì:
- Share types với `apps/backend` — đặc biệt là shape của `/push` request body. Khi BE đổi field, FE và bridge cùng update 1 chỗ.
- Test E2E chung: `docker-compose.bridge.yml` có thể spin lên BE + bridge fake để smoke-test trước khi ship.
- 1 PR pattern, 1 review checklist, 1 lint config.
- pnpm workspace dùng `node-zklib` mà không nhiễm vào BE (bridge depends on nó, BE thì không).

**Deploy tách rời** vì:
- BE chạy cloud (Vercel/Railway/AWS), không thể reach LAN khách hàng.
- Bridge chạy 1 process nhỏ (PM2 / Docker Compose / Windows Service) trên 1 máy mini-PC hoặc VM ở văn phòng khách hàng.
- Bridge không cần Postgres / Redis / Prisma — chỉ cần Node + axios + node-zklib.
- Update bridge không phải redeploy BE và ngược lại.

Ranh giới deploy: BE compose file **không** include `zk-bridge`. Bridge có file compose riêng `services/zk-bridge/docker-compose.yml` để khách hàng kéo về và chạy độc lập.

## Phạm vi MVP của bridge

| Có | Không (defer) |
|---|---|
| Poll 1 device ZKTeco qua `node-zklib` định kỳ (interval cấu hình từ UI) | Multi-device per bridge instance (1 bridge = 1 device) |
| Translate `Attendance` records → generic JSON contract C-HR | Hikvision ISAPI / Suprema BioStar adapters |
| **Local web UI** (localhost) để admin nhập config + xem cycle status — không cần sửa file env tay | Multi-tenant UI (nhiều Org cùng 1 bridge) |
| **SQLite local** lưu config, single-user credentials, last `eventLogId`, offline event queue, audit log cycle | Postgres / external DB |
| **Single-user auth**: tài khoản admin duy nhất, tạo ở first-start setup, không có signup flow sau đó | Multi-user / role-based UI |
| **LAN device scan**: auto-discover ZKTeco IP trong subnet (probe TCP 4370) | Cross-subnet / VPN discovery |
| **Auto-start on boot**: install systemd / Windows Service / launchd qua 1 toggle UI | Auto-update bản thân bridge |
| Retry với exponential backoff khi C-HR unreachable; queue event vào SQLite, retry khi online | Buffering offline > 7 ngày (cleanup tự động) |
| Health-check log mỗi cycle, hiển thị trên UI dashboard | Push qua MQTT thay HTTPS |

**Tinh thần**: bridge đơn giản nhưng *non-tech admin có thể tự cài + cấu hình qua trình duyệt*. State thật vẫn ở C-HR backend (idempotency qua `(deviceId, eventLogId)`); SQLite chỉ là local cache để bridge chạy offline-tolerant.

## Local UI + first-start setup

Bridge tự host 1 HTTP server nội bộ (mặc định `http://localhost:7000`) phục vụ UI + REST cho chính nó. UI render bằng plain HTML + Tailwind (CDN) hoặc bundle nhỏ — **không** dùng Next.js/React heavy. Mục tiêu là 1 binary chạy được trên mini-PC offline.

### First-start flow

```
[bridge khởi động lần đầu]
        │
        ▼
[SELECT * FROM users → empty?]
        │ Yes
        ▼
[/setup — form: username, password, password confirm]
        │ submit → bcrypt hash, INSERT users
        ▼
[/login auto-fill username]
        │
        ▼
[/login OK → session cookie 7 ngày]
        ▼
[/dashboard]
```

- Setup chỉ chạy được **một lần**: khi bảng `users` đã có row, route `/setup` redirect về `/login`.
- Chỉ 1 user, không "đổi mật khẩu quên" qua email — quên thì SSH vào máy chạy `zk-bridge reset-user` (CLI subcommand) rồi setup lại.
- Session lưu cookie httpOnly với secret được sinh random và lưu trong SQLite (`config.session_secret`).

### UI views (cần)

| Route | Chức năng |
|---|---|
| `/setup` | First-run only: tạo username + password (bcrypt) |
| `/login` | Username + password → session cookie |
| `/dashboard` | Cycle stats: lần poll cuối, số event đã push, số queued offline, errors gần nhất |
| `/config/chr` | Form: `CHR_API_URL`, `CHR_DEVICE_ID`, `CHR_DEVICE_TOKEN`. Test button → POST `/push` rỗng để verify token |
| `/config/zk` | Form: `ZK_HOST`, `ZK_PORT` (default 4370), `POLL_INTERVAL_MIN`. **Scan button** → trigger LAN scan |
| `/config/system` | Toggle "Auto-start on boot" + "Run a cycle now" + "Reset state" |
| `/logs` | Cycle history từ SQLite (paginated, 100 row gần nhất) |

### LAN scan

Endpoint `POST /api/scan` ở UI server:

1. Lấy interface IP của máy bridge → suy ra subnet (`192.168.1.0/24` chẳng hạn).
2. Iterate tất cả host trong /24, mỗi host thử `net.connect({ host, port: 4370, timeout: 500 })`.
3. Trả về danh sách IP open port → UI hiển thị, user click 1 IP để fill vào `/config/zk`.

Optional (defer): probe sâu hơn để xác nhận đó đúng là ZKTeco (gửi 1 packet CMD_CONNECT, đợi response) — chống false positive nếu có thiết bị khác cùng port.

### Auto-start on boot (cross-platform)

Toggle ở `/config/system` gọi 1 trong 3 hàm tuỳ `process.platform`:

| Platform | Cách làm |
|---|---|
| Linux | Ghi unit file `/etc/systemd/system/zk-bridge.service` → `systemctl enable --now zk-bridge`. Cần sudo lúc install (UI prompt password sudo 1 lần) |
| Windows | Dùng [`node-windows`](https://www.npmjs.com/package/node-windows) hoặc shell ra `nssm install` để register service. Hoặc tạo Task Scheduler entry với `schtasks /create` |
| macOS | Ghi `~/Library/LaunchAgents/com.chr.zk-bridge.plist` → `launchctl load` |

Toggle off → unregister + dừng service. Bridge cần lưu trạng thái current "đã enable autostart chưa" trong SQLite (`config.autostart_enabled = 0|1`) để UI hiển thị đúng checkbox state.

## SQLite schema

File `data/zk-bridge.db` (path configurable qua env `DATA_DIR`, default `./data/`). Dùng [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3) (sync API, đơn giản, fast cho workload nhỏ).

```sql
-- Single-user credentials. Tối đa 1 row.
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Key-value config (CHR_API_URL, ZK_HOST, session_secret, autostart_enabled, ...).
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Last event push state. 1 row.
CREATE TABLE state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_event_log_id INTEGER NOT NULL DEFAULT 0,
  last_sync_at TEXT
);

-- Offline event queue: events poll được nhưng C-HR unreachable.
-- Drained khi push thành công.
CREATE TABLE event_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payload_json TEXT NOT NULL,    -- JSON.stringify({eventLogId, employeeCode, timestamp, type})
  enqueued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

-- Cycle audit (mỗi lần poll = 1 row, giữ tối đa 1000 row, rotate cũ).
CREATE TABLE cycle_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  events_polled INTEGER,
  events_pushed INTEGER,
  events_queued INTEGER,
  status TEXT NOT NULL,    -- 'ok' | 'zk_error' | 'chr_error' | 'partial'
  error_message TEXT
);
```

## Layout dự kiến (revised)

```
services/zk-bridge/
├── package.json           # better-sqlite3, express|hono, bcrypt, node-zklib, axios, node-cron, node-windows (windows-only optional dep)
├── tsconfig.json
├── Dockerfile             # alt deploy method (không phải primary — autostart làm tốt hơn cho LAN máy mini-PC)
├── docker-compose.yml     # alt deploy
├── .env.example           # PORT, DATA_DIR — chỉ override path-level, mọi config khác qua UI
├── README.md
├── installer/
│   ├── install-linux.sh   # bootstrap: cài node + clone + systemd
│   ├── install-windows.ps1
│   └── install-macos.sh
└── src/
    ├── index.ts           # bootstrap: load DB, ensure tables, start UI server, start scheduler
    ├── server/            # local HTTP UI + REST
    │   ├── server.ts      # Hono/Express setup, session middleware
    │   ├── auth.ts        # /setup, /login, /logout
    │   ├── routes/
    │   │   ├── config.ts  # GET/PATCH chr + zk + system config
    │   │   ├── scan.ts    # POST /api/scan — LAN device scan
    │   │   ├── cycle.ts   # POST /api/cycle/run — trigger cycle now
    │   │   └── logs.ts    # GET /api/logs — paginated cycle history
    │   └── ui/            # static HTML + Tailwind CDN
    │       ├── setup.html
    │       ├── login.html
    │       ├── dashboard.html
    │       └── config.html
    ├── poll/
    │   ├── scheduler.ts   # node-cron, gọi pollOnce theo interval từ config
    │   ├── poll.ts        # 1 cycle: connect → fetch → translate → push (drain queue)
    │   ├── zk-client.ts   # wrapper quanh node-zklib
    │   └── chr-client.ts  # axios POST với retry + on-failure-enqueue
    ├── scan/
    │   └── lan-scan.ts    # subnet discovery TCP 4370
    ├── boot/              # auto-start install/uninstall
    │   ├── linux-systemd.ts
    │   ├── windows-service.ts
    │   └── macos-launchd.ts
    ├── db/
    │   ├── index.ts       # better-sqlite3 connection + migrations
    │   └── schema.sql     # tables ở trên
    └── cli/
        └── reset-user.ts  # subcommand: xoá row users để setup lại
```

## Generic JSON contract (đã chốt — F3)

Bridge POST body khớp `PushAttendanceDto`:

```json
{
  "deviceId": "<UUID từ /attendance-devices register>",
  "token": "<plaintext shown once>",
  "events": [
    {
      "eventLogId": "200001234",
      "employeeCode": "EMP-0001",
      "timestamp": "2026-05-04T08:12:00Z",
      "type": "IN"
    }
  ]
}
```

**Mapping ZKTeco → contract** (theo `node-zklib`):

| ZKTeco field | C-HR field | Ghi chú |
|---|---|---|
| `userSn` | `eventLogId` (string) | ID nội bộ device — idempotency key |
| `deviceUserId` | `employeeCode` | trỏ vào `Employee.code` trong cùng Org |
| `recordTime` | `timestamp` (ISO 8601) | convert qua `new Date().toISOString()` |
| `state` (1=in, 2=out) | `type` ('IN' / 'OUT') | nếu device không cấu hình thì gán `IN`, server tự lo MIN/MAX |
| (none) | `note` | optional, để trống |

Skeleton implementation (reference từ code legacy của bạn):

```typescript
// services/zk-bridge/src/poll.ts
import ZKLib from 'node-zklib';
import axios from 'axios';
import { readState, writeState } from './state';

export async function pollOnce(env: BridgeEnv): Promise<void> {
  const zk = new ZKLib(env.ZK_HOST, env.ZK_PORT, 10000, 4000);
  try {
    await zk.createSocket();
    const att = await zk.getAttendances();
    const lastSeen = await readState();

    const events = att.data
      .filter((l) => l.deviceUserId !== '0' && l.userSn > lastSeen)
      .map((l) => ({
        eventLogId: String(l.userSn),
        employeeCode: l.deviceUserId,
        timestamp: new Date(l.recordTime).toISOString(),
        type: l.state === 2 ? 'OUT' : 'IN',
      }));

    if (events.length === 0) return;

    await axios.post(
      `${env.CHR_API_URL}/attendance-devices/push`,
      { deviceId: env.CHR_DEVICE_ID, token: env.CHR_DEVICE_TOKEN, events },
      { timeout: 30_000 },
    );

    const maxSn = Math.max(...events.map((e) => Number(e.eventLogId)));
    await writeState(maxSn);
  } finally {
    await zk.disconnect().catch(() => {});
  }
}
```

## Quy trình triển khai (khách hàng)

Mục tiêu: 1 admin **không phải dev** (HRM admin của khách hàng) có thể tự cài + cấu hình qua trình duyệt.

1. **Trên C-HR**: HRM admin đăng ký device qua `/settings/attendance-devices` → nhận `deviceId` UUID + `token` plaintext (1 lần). Save 2 giá trị này (copy ra notepad / phone).
2. **Trên máy LAN khách hàng** (mini-PC / VM Windows / Linux):
   - Tải installer phù hợp platform từ release page hoặc chạy 1 line:

     ```bash
     # Linux
     curl -sSL https://<...>/install-linux.sh | sudo bash

     # Windows (PowerShell admin)
     iwr -useb https://<...>/install-windows.ps1 | iex

     # macOS
     curl -sSL https://<...>/install-macos.sh | bash
     ```

   - Installer cài Node + clone bridge + start service trên port `7000`.
3. **Mở `http://localhost:7000`** trên trình duyệt:
   - **First-start**: form setup tạo username/password admin local (1 lần duy nhất).
   - **`/config/chr`**: dán `CHR_API_URL`, `CHR_DEVICE_ID`, `CHR_DEVICE_TOKEN` → "Test connection" → OK.
   - **`/config/zk`**: bấm "Scan LAN" → chọn IP device từ danh sách → set interval → Save.
   - **`/config/system`**: toggle "Auto-start on boot" → ON.
4. **Verify**: dashboard hiển thị "Last cycle: 0 events" sau interval đầu. Test bằng vân tay 1 nhân viên → cycle tiếp theo push event → dashboard "Last cycle: 1 event pushed". Trong C-HR `/timesheet`, log xuất hiện ~ngay.

Từ giờ admin chỉ cần mở `http://<máy-bridge-ip>:7000` từ máy khác trong cùng LAN khi muốn xem dashboard / đổi cấu hình. Không cần SSH / sửa file env / restart container nữa.

## Bảo mật

**Tài khoản local UI**:

- Password băm bcrypt cost 10, lưu trong SQLite. Không có "quên mật khẩu" — admin của khách hàng giữ trách nhiệm.
- Khi mất quyền: dev/IT SSH vào máy chạy `node dist/cli/reset-user.js` → SQLite xoá row users → next request redirect `/setup` lại.
- Session cookie httpOnly, secret random sinh ở first-start lưu trong `config.session_secret`. TTL 7 ngày.
- UI bind mặc định `127.0.0.1:7000` → chỉ truy cập từ chính máy bridge. Muốn cho phép admin truy cập từ máy khác cùng LAN, đặt env `BIND_HOST=0.0.0.0` và bật firewall whitelist.

**C-HR token**:

- Lưu trong SQLite `config` (encrypted at rest tuỳ chọn — F2 of bridge). Không commit.
- C-HR `/push` verify bcrypt qua `device.token` server-side; bridge gửi plaintext → cần HTTPS giữa bridge và C-HR (`CHR_API_URL=https://...`).
- Token compromise → C-HR admin "Regenerate token" → bridge admin paste token mới qua `/config/chr` (không cần restart, change apply ngay cycle tiếp theo).

**Surface area**:

- Bridge không lưu Employee data, Org data — chỉ lưu event payload đã enqueue (clear sau push thành công) + cycle audit.
- SQLite file `data/zk-bridge.db` permissions `0600`, owner = service account.
- Auto-start install cần sudo/admin 1 lần (tạo systemd unit / Windows Service / launchd plist) — UI prompt rõ ràng và explain trước.

## Khi nào bắt đầu

**Trigger**: có khách hàng thật cần kết nối device ZKTeco. Trước đó skeleton folder + README placeholder là đủ.

**Pre-req trước khi code**:
- [ ] F1–F4 đóng và verified runtime.
- [ ] F5 (Universal Request) ổn định (vì attendance correction qua Request engine — flow hoàn chỉnh).
- [ ] `/settings/attendance-devices` UI đã được smoke-test với 1 device giả (POST `/push` qua Postman / curl pass).
- [ ] Có physical device ZKTeco hoặc emulator để integration-test.

**Không-pre-req** (làm song song được):
- F6/refactor — bridge không phụ thuộc internals của BE, chỉ dùng public contract.

## Defer cho phiên bản tiếp theo

- Hikvision / Suprema adapter (mỗi vendor 1 file `*-adapter.ts`).
- Multi-device per bridge instance (1 bridge cấu hình N device).
- Multi-user UI / role-based (HR, IT, viewer).
- Encrypted-at-rest cho SQLite `config.token` (dùng OS keychain hoặc DPAPI Windows).
- Push qua MQTT thay vì HTTPS (cho mạng yếu).
- Tự xác minh device đúng là ZKTeco sau khi scan (gửi packet CMD_CONNECT thật).
- Auto-update của chính bridge (download new release + restart).
- Backup / restore SQLite qua UI.

## References

- Code legacy của user (ZKLib + node-schedule + bulkCreate MySQL) — đã in trong chat lịch sử của tích hợp này. Logic poll + map `userSn → logId` chính xác — bridge chỉ đổi đích MySQL → HTTPS.
- [F3 Attendance trong features.md](features.md) — push endpoint contract định danh.
- [ADR 0006](../decisions/0006-universal-request-engine.md) — khi cần manual correction (quên chấm), user tạo Request type `checkin/checkout`, không qua bridge.
