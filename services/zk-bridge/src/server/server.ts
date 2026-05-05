import bcrypt from 'bcryptjs';
import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

import { getAutostartProvider } from '../boot/index';
import { ConfigKeys, isSharedComplete, readSharedConfig } from '../config/runtime';
import {
  createDevice,
  deleteDevice as deleteDeviceRow,
  getConfig,
  getDevice,
  listCycleLogs,
  listDevices,
  setConfig,
  setConfigMany,
  updateDevice,
  type DeviceInput,
} from '../db/repo';
import { User } from '../db/models';
import { pushEvents } from '../poll/chr-client';
import { restartScheduler, runOnce } from '../poll/scheduler';
import { totalQueuedAcrossDevices } from '../poll/poll';
import { scanSubnetFor, type ScanCandidate } from '../scan/lan-scan';

import {
  getSessionSecret,
  packSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  unpackSession,
} from './session';
import { renderLoginPage, renderSetupPage } from './ui/auth-pages';
import { renderChrConfigPage, renderSystemConfigPage } from './ui/config-pages';
import { renderDashboard } from './ui/dashboard-page';
import { renderDevicesPage } from './ui/devices-page';
import { renderLogsPage } from './ui/logs-page';

interface SessionVars {
  Variables: { userId: number };
}

const PUBLIC_PATHS = new Set(['/setup', '/login']);

async function userCount(): Promise<number> {
  return User.count();
}

async function setSessionCookie(c: Context, userId: number): Promise<void> {
  const secret = await getSessionSecret();
  const value = packSession(userId, secret);
  setCookie(c, SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

function parseDeviceForm(form: Record<string, unknown>): DeviceInput | string {
  const name = String(form.name ?? '').trim();
  const host = String(form.host ?? '').trim();
  const port = Number(form.port);
  const chrDeviceToken = String(form.chrDeviceToken ?? '').trim();
  const enabled = form.enabled === '1' || form.enabled === 'on' || form.enabled === true;

  if (!name) return 'Name is required.';
  if (!host) return 'Device IP is required.';
  if (!Number.isFinite(port) || port < 1 || port > 65535) return 'Invalid port.';
  if (!chrDeviceToken) return 'C-HR Device token is required.';

  return { name, host, port, chrDeviceToken, enabled };
}

let lastScanResults: ScanCandidate[] = [];
let lastScanRan = false;

export function createServer(): Hono<SessionVars> {
  const app = new Hono<SessionVars>();

  app.use('*', async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (PUBLIC_PATHS.has(path) || path.startsWith('/_static')) {
      return next();
    }
    const count = await userCount();
    if (count === 0) {
      return c.redirect('/setup');
    }
    const cookie = getCookie(c, SESSION_COOKIE);
    if (!cookie) return c.redirect('/login');
    const secret = await getSessionSecret();
    const sess = unpackSession(cookie, secret);
    if (!sess) {
      deleteCookie(c, SESSION_COOKIE, { path: '/' });
      return c.redirect('/login');
    }
    c.set('userId', sess.userId);
    return next();
  });

  app.get('/', (c) => c.redirect('/dashboard'));

  // ---------- /setup ----------
  app.get('/setup', async (c) => {
    if ((await userCount()) > 0) return c.redirect('/login');
    return c.html(renderSetupPage());
  });

  app.post('/setup', async (c) => {
    if ((await userCount()) > 0) return c.redirect('/login');
    const form = await c.req.parseBody();
    const username = String(form.username ?? '').trim();
    const password = String(form.password ?? '');
    const confirm = String(form.confirm ?? '');
    if (username.length < 3) {
      return c.html(
        renderSetupPage({ error: { message: 'Username must be at least 3 characters.' } }),
      );
    }
    if (password.length < 8) {
      return c.html(
        renderSetupPage({ error: { message: 'Password must be at least 8 characters.' } }),
      );
    }
    if (password !== confirm) {
      return c.html(renderSetupPage({ error: { message: 'Passwords do not match.' } }));
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });
    await setSessionCookie(c, user.id);
    return c.redirect('/dashboard');
  });

  // ---------- /login ----------
  app.get('/login', async (c) => {
    if ((await userCount()) === 0) return c.redirect('/setup');
    return c.html(renderLoginPage());
  });

  app.post('/login', async (c) => {
    const form = await c.req.parseBody();
    const username = String(form.username ?? '').trim();
    const password = String(form.password ?? '');
    const user = await User.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return c.html(
        renderLoginPage({ error: { message: 'Invalid username or password.' }, username }),
      );
    }
    await setSessionCookie(c, user.id);
    return c.redirect('/dashboard');
  });

  app.post('/logout', (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.redirect('/login');
  });

  // ---------- /dashboard ----------
  app.get('/dashboard', async (c) => {
    const shared = await readSharedConfig();
    const devices = await listDevices();
    const totalQueued = await totalQueuedAcrossDevices();
    const recentCycles = await listCycleLogs({ limit: 20 });
    return c.html(
      renderDashboard({
        apiUrlSet: Boolean(shared.chrApiUrl),
        shared,
        devices,
        totalQueued,
        recentCycles,
      }),
    );
  });

  // ---------- /devices ----------
  app.get('/devices', async (c) => {
    const shared = await readSharedConfig();
    const devices = await listDevices();
    return c.html(
      renderDevicesPage({
        devices,
        scanResults: lastScanResults,
        scanRan: lastScanRan,
        apiUrlSet: Boolean(shared.chrApiUrl),
      }),
    );
  });

  app.post('/devices', async (c) => {
    const form = await c.req.parseBody();
    const parsed = parseDeviceForm(form as Record<string, unknown>);
    if (typeof parsed === 'string') {
      const devices = await listDevices();
      const shared = await readSharedConfig();
      return c.html(
        renderDevicesPage({
          devices,
          scanResults: lastScanResults,
          scanRan: lastScanRan,
          apiUrlSet: Boolean(shared.chrApiUrl),
          flash: { kind: 'err', message: parsed },
        }),
      );
    }
    await createDevice(parsed);
    return c.redirect('/devices');
  });

  app.post('/devices/scan', async (c) => {
    try {
      lastScanResults = await scanSubnetFor(4370, 500);
      lastScanRan = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastScanResults = [];
      lastScanRan = true;
      const devices = await listDevices();
      const shared = await readSharedConfig();
      return c.html(
        renderDevicesPage({
          devices,
          scanResults: [],
          scanRan: true,
          apiUrlSet: Boolean(shared.chrApiUrl),
          flash: { kind: 'err', message: `Scan failed: ${msg}` },
        }),
      );
    }
    return c.redirect('/devices');
  });

  app.post('/devices/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isFinite(id)) return c.redirect('/devices');
    const form = await c.req.parseBody();
    const parsed = parseDeviceForm(form as Record<string, unknown>);
    if (typeof parsed === 'string') {
      const devices = await listDevices();
      const shared = await readSharedConfig();
      return c.html(
        renderDevicesPage({
          devices,
          scanResults: lastScanResults,
          scanRan: lastScanRan,
          apiUrlSet: Boolean(shared.chrApiUrl),
          flash: { kind: 'err', message: parsed },
        }),
      );
    }
    await updateDevice(id, parsed);
    return c.redirect('/devices');
  });

  app.post('/devices/:id/delete', async (c) => {
    const id = Number(c.req.param('id'));
    if (Number.isFinite(id)) await deleteDeviceRow(id);
    return c.redirect('/devices');
  });

  app.post('/devices/:id/test', async (c) => {
    const id = Number(c.req.param('id'));
    const device = Number.isFinite(id) ? await getDevice(id) : null;
    const shared = await readSharedConfig();
    let flash: { kind: 'ok' | 'err'; message: string };
    if (!device || !shared.chrApiUrl) {
      flash = { kind: 'err', message: 'Device not found, or C-HR API URL is missing.' };
    } else {
      try {
        await pushEvents(
          { baseUrl: shared.chrApiUrl, token: device.chrDeviceToken },
          [],
        );
        flash = {
          kind: 'ok',
          message: `${device.name}: reached C-HR. Token accepted.`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/HTTP 400/.test(msg) && /events/i.test(msg)) {
          flash = {
            kind: 'ok',
            message: `${device.name}: reached C-HR. Token accepted.`,
          };
        } else {
          flash = { kind: 'err', message: `${device.name}: ${msg}` };
        }
      }
    }
    const devices = await listDevices();
    return c.html(
      renderDevicesPage({
        devices,
        scanResults: lastScanResults,
        scanRan: lastScanRan,
        apiUrlSet: Boolean(shared.chrApiUrl),
        flash,
      }),
    );
  });

  // ---------- /config/chr ----------
  app.get('/config/chr', async (c) => {
    const config = await readSharedConfig();
    return c.html(renderChrConfigPage({ config }));
  });

  app.post('/config/chr', async (c) => {
    const form = await c.req.parseBody();
    const interval = Number(form.pollIntervalMin);
    if (!Number.isFinite(interval) || interval < 1 || interval > 1440) {
      const config = await readSharedConfig();
      return c.html(
        renderChrConfigPage({
          config,
          flash: { kind: 'err', message: 'Invalid poll interval (1–1440 min).' },
        }),
      );
    }
    await setConfigMany({
      [ConfigKeys.ChrApiUrl]: String(form.chrApiUrl ?? '').trim(),
      [ConfigKeys.PollIntervalMin]: String(interval),
    });
    await restartScheduler();
    const config = await readSharedConfig();
    return c.html(
      renderChrConfigPage({
        config,
        flash: {
          kind: 'ok',
          message: 'Saved. Scheduler restarted with the new interval.',
        },
      }),
    );
  });

  // ---------- /config/system ----------
  app.get('/config/system', async (c) => {
    const enabled = (await getConfig(ConfigKeys.AutostartEnabled)) === '1';
    return c.html(renderSystemConfigPage({ autostartEnabled: enabled }));
  });

  app.post('/config/system/autostart', async (c) => {
    const form = await c.req.parseBody();
    const action = String(form.action ?? '');
    const provider = getAutostartProvider();
    let flash: { kind: 'ok' | 'err'; message: string };
    try {
      if (action === 'enable') {
        await provider.install();
        await setConfig(ConfigKeys.AutostartEnabled, '1');
        flash = { kind: 'ok', message: `Auto-start enabled (${provider.describe()}).` };
      } else if (action === 'disable') {
        await provider.uninstall();
        await setConfig(ConfigKeys.AutostartEnabled, '0');
        flash = { kind: 'ok', message: 'Auto-start disabled.' };
      } else {
        flash = { kind: 'err', message: 'Unknown action.' };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      flash = {
        kind: 'err',
        message: `Auto-start ${action} failed: ${msg}. You may need admin/sudo privileges.`,
      };
    }
    const enabled = (await getConfig(ConfigKeys.AutostartEnabled)) === '1';
    return c.html(renderSystemConfigPage({ autostartEnabled: enabled, flash }));
  });

  // ---------- /api/cycle/run ----------
  app.post('/api/cycle/run', (c) => {
    void runOnce();
    return c.redirect('/dashboard');
  });

  // ---------- /logs ----------
  app.get('/logs', async (c) => {
    const pageRaw = Number(c.req.query('page') ?? '1');
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const filterRaw = c.req.query('deviceId');
    const filterDeviceId = filterRaw && filterRaw !== '' ? Number(filterRaw) : null;
    const pageSize = 50;
    const cycles = await listCycleLogs({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      deviceId: filterDeviceId ?? undefined,
    });
    const devices = await listDevices();
    return c.html(
      renderLogsPage({
        cycles,
        devices,
        page,
        pageSize,
        filterDeviceId,
      }),
    );
  });

  return app;
}
