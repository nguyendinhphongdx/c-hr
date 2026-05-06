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

# OR: peek at the last N events on a device — útil khi sanity-check tích
# hợp device mà chưa muốn push lên C-HR.
pnpm --filter @c-hr/zk-bridge recent-events --device "Cửa chính" -n 30
```

Open <http://127.0.0.1:7000> — first time hits `/setup` to create the local
admin. Subsequent starts hit `/login`.

## CLI (npm-package style)

The package exposes a `zk-bridge` binary so admins can drive it without
remembering paths. After installing the package globally:

```bash
zk-bridge start                                  # UI + scheduler (default)
zk-bridge poll-once                              # one cycle then exit
zk-bridge reset-user                             # recover from lost password
zk-bridge recent-events --device "Cửa chính" -n 30
zk-bridge --help
zk-bridge --version
```

Env vars (`DATA_DIR`, `PORT`, `BIND_HOST`) work as flags via shell:

```bash
PORT=8080 BIND_HOST=0.0.0.0 zk-bridge start
```

### Where the data dir lives

`zk-bridge start` prints `[zk-bridge] data dir: <path>` on boot. Resolution
order:

1. `DATA_DIR` env var (Docker compose / explicit override)
2. `./data/` if it already exists next to cwd (dev workflow, bind mount)
3. **Globally installed (npm i -g)** → OS-standard user data dir:
   - Linux: `$XDG_DATA_HOME/zk-bridge` (default `~/.local/share/zk-bridge`)
   - macOS: `~/Library/Application Support/zk-bridge`
   - Windows: `%APPDATA%\zk-bridge` (default `~/AppData/Roaming/zk-bridge`)
4. `./data/` next to cwd (dev fallback)

### Install globally (before publishing — local install)

```bash
cd services/zk-bridge
pnpm install
pnpm build
npm install -g .         # symlinks `zk-bridge` to dist/cli/zk-bridge.js
zk-bridge start
```

### Ship a tarball to the customer machine

```bash
cd services/zk-bridge && pnpm build && npm pack
# yields c-hr-zk-bridge-0.1.0.tgz
scp c-hr-zk-bridge-0.1.0.tgz <customer-host>:
ssh <customer-host> 'npm install -g ~/c-hr-zk-bridge-0.1.0.tgz && zk-bridge start'
```

### Publish to public npm

One-time setup:

1. Decide on a published name. `@c-hr/zk-bridge` requires owning the `c-hr`
   org on npm. If unavailable, use unscoped (`chr-zk-bridge`) or your personal
   scope (`@<your-username>/zk-bridge`).
2. `npm login` (or `npm adduser` for new account).
3. Set `"private": false` in [package.json](package.json) — required for publish.
4. Verify `files` (currently `["dist/", "README.md"]`) and run `npm pack` to
   inspect what would actually ship.

Each release:

```bash
cd services/zk-bridge
pnpm build
npm version <patch|minor|major>          # bumps version + git tag
npm publish --access public              # --access public required for scoped names
```

After publishing:

```bash
# On customer host
npm install -g @c-hr/zk-bridge
zk-bridge start
```

Auto-start on boot is then enabled either via the UI toggle (registers
systemd / Windows Scheduled Task / launchd pointing at the global `zk-bridge`
binary) or via the customer's preferred process manager (PM2, supervisord).

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

Choose one of two paths:

### Option A — Native installer (recommended)

Best for non-tech admins on a fresh mini-PC. Installer cài Node + clone repo +
build + start. Auto-start on boot is then enabled via the UI toggle (uses
systemd / Windows Scheduled Task / launchd).

1. On C-HR cloud: register the device → copy the JWT token.
2. On the LAN box (mini-PC / VM):
   - Linux: `curl -sSL https://<release>/install-linux.sh | bash`
   - Windows (PowerShell): `iwr -useb https://<release>/install-windows.ps1 | iex`
   - macOS: `curl -sSL https://<release>/install-macos.sh | bash`
3. Open `http://127.0.0.1:7000` → setup form → fill `/config/chr` + add devices
   → toggle `Auto-start on boot`.

### Option B — Docker Compose

Best when the LAN host already runs Docker (small homelab, NAS, k8s edge).

```bash
git clone <repo> c-hr
cd c-hr/services/zk-bridge
docker compose up -d --build
open http://<host-ip>:7000
```

`./data/` next to the compose file persists SQLite + admin credentials —
container recreate / image upgrade keeps state. Default networking is bridge
mode (port 7000 exposed). For Linux production, switch to `network_mode: host`
in [docker-compose.yml](docker-compose.yml) so LAN scan probes the office
subnet correctly instead of the docker bridge subnet.

## Layout

```text
services/zk-bridge/
├── Dockerfile              # multi-stage build (node:22-bookworm-slim base)
├── docker-compose.yml      # standalone deploy on customer LAN
├── installer/              # native install scripts run by customer admin
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
