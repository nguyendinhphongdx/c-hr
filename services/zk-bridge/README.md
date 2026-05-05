# services/zk-bridge

Pull-side adapter that polls a ZKTeco device over TCP (`node-zklib`) and pushes
attendance events to C-HR over HTTPS. Runs at the customer's LAN, **not** with
the C-HR backend cloud. Spec: [docs/plans/zk-bridge.md](../../docs/plans/zk-bridge.md).

## Implementation status

| Slice | Status | What it covers |
| --- | --- | --- |
| 1 — skeleton + poll | done | env-driven one-shot poll → push, contract verified |
| 2 — SQLite + scheduler | done | sequelize models, state cursor, offline queue, cycle log, node-cron |
| 3 — local UI + auth | done | Hono server, single-user bcrypt + signed cookie session, dashboard + config + logs pages |
| 4 — scan + autostart + installer + CLI | done | LAN /24 probe, systemd / Windows Scheduled Task / launchd, install scripts, `reset-user` CLI |

## Quick start (dev)

```bash
pnpm install --filter @c-hr/zk-bridge
pnpm --filter @c-hr/zk-bridge build

# Optional: pre-seed config from .env so the UI is usable without typing.
cp services/zk-bridge/.env.example services/zk-bridge/.env

# Start the bridge — UI + scheduler both run.
pnpm --filter @c-hr/zk-bridge start

# OR: run a single poll cycle and exit (useful for smoke-testing a device).
pnpm --filter @c-hr/zk-bridge poll:once

# OR: reset the local admin user when the password is lost.
pnpm --filter @c-hr/zk-bridge reset-user
```

Open <http://127.0.0.1:7000> — first time hits `/setup` to create the local
admin. Subsequent starts hit `/login`.

## Environment

The bridge expects almost everything to be entered through the UI. Only path /
listen-binding settings come from env:

| Env | Default | Purpose |
| --- | --- | --- |
| `DATA_DIR` | `./data` | Where `zk-bridge.db` (SQLite) lives |
| `PORT` | `7000` | UI HTTP port |
| `BIND_HOST` | `127.0.0.1` | Bind address. Set `0.0.0.0` to allow LAN access |

`CHR_*` and `ZK_*` env vars (see `.env.example`) are seeded **once**, on the
very first start, into the SQLite `config` table. After that they are ignored —
edit values via the UI.

## Customer install (LAN admin)

1. On C-HR cloud: `/settings/attendance-devices` → register device → copy
   `deviceId` UUID + plaintext token.
2. On the LAN box (mini-PC / VM):
   - Linux: `curl -sSL https://<release>/install-linux.sh | bash`
   - Windows (PowerShell): `iwr -useb https://<release>/install-windows.ps1 | iex`
   - macOS: `curl -sSL https://<release>/install-macos.sh | bash`
3. Open `http://127.0.0.1:7000` → setup form → fill `/config/chr` + `/config/zk`
   → toggle `Auto-start on boot`. From this point the bridge is unattended.

## Layout

```text
services/zk-bridge/
├── installer/              # platform install scripts run by customer admin
├── src/
│   ├── boot/               # auto-start install (linux/windows/macos)
│   ├── cli/reset-user.ts   # CLI subcommand to wipe the local admin
│   ├── config/             # env reader + DB-backed runtime config
│   ├── db/                 # sequelize models + repo
│   ├── poll/               # cycle runner, ZK client, C-HR client, scheduler
│   ├── scan/lan-scan.ts    # /24 TCP probe for ZKTeco devices
│   └── server/             # Hono HTTP UI + session middleware + page renderers
├── package.json
└── tsconfig.json
```

Token / event idempotency lives at C-HR side via `(deviceId, eventLogId)` —
the bridge keeps SQLite only as a local cache so it can run offline-tolerant.
