import { isSharedComplete, readSharedConfig } from '../config/runtime';
import {
  countQueuedEvents,
  deleteQueuedEvents,
  enqueueEvents,
  finishCycle,
  listEnabledDevices,
  listQueuedEvents,
  markQueuedFailure,
  rotateCycleLogs,
  startCycle,
  updateDeviceCursor,
  type DeviceView,
} from '../db/repo';

import { pushEvents } from './chr-client';
import { translateZkRecord } from './translate';
import type { AttendanceEvent } from './types';
import { fetchAttendances } from './zk-client';

export interface DeviceCycleResult {
  deviceId: number;
  deviceName: string;
  status: 'ok' | 'zk_error' | 'chr_error' | 'partial';
  pulled: number;
  pushed: number;
  queued: number;
  message?: string;
}

export interface CycleSummary {
  ranAt: Date;
  apiUrlMissing: boolean;
  noDevices: boolean;
  results: DeviceCycleResult[];
}

export async function runCycle(): Promise<CycleSummary> {
  const summary: CycleSummary = {
    ranAt: new Date(),
    apiUrlMissing: false,
    noDevices: false,
    results: [],
  };

  const shared = await readSharedConfig();
  if (!isSharedComplete(shared)) {
    summary.apiUrlMissing = true;
    return summary;
  }

  const devices = await listEnabledDevices();
  if (devices.length === 0) {
    summary.noDevices = true;
    return summary;
  }

  for (const device of devices) {
    const result = await runDeviceCycle(shared.chrApiUrl, device);
    summary.results.push(result);
  }
  await rotateCycleLogs();
  return summary;
}

async function runDeviceCycle(
  apiUrl: string,
  device: DeviceView,
): Promise<DeviceCycleResult> {
  const cycleId = await startCycle(device.id, device.name);
  let pulled = 0;
  let pushed = 0;
  let queuedNow = 0;

  // 1. Drain offline queue first.
  const queued = await listQueuedEvents(device.id, 500);
  if (queued.length > 0) {
    const events = queued.map((q) => JSON.parse(q.payloadJson) as AttendanceEvent);
    try {
      await pushEvents({ baseUrl: apiUrl, token: device.chrDeviceToken }, events);
      await deleteQueuedEvents(queued.map((q) => q.id));
      pushed += events.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markQueuedFailure(
        queued.map((q) => q.id),
        msg,
      );
      await finishCycle(cycleId, {
        eventsPolled: 0,
        eventsPushed: pushed,
        eventsQueued: queued.length,
        status: 'chr_error',
        errorMessage: msg,
      });
      await updateDeviceCursor(device.id, { lastStatus: 'chr_error', lastError: msg });
      return {
        deviceId: device.id,
        deviceName: device.name,
        status: 'chr_error',
        pulled: 0,
        pushed,
        queued: queued.length,
        message: msg,
      };
    }
  }

  // 2. Poll device for new records.
  let records;
  try {
    records = await fetchAttendances(device.host, device.port);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await finishCycle(cycleId, {
      eventsPolled: 0,
      eventsPushed: pushed,
      eventsQueued: 0,
      status: 'zk_error',
      errorMessage: msg,
    });
    await updateDeviceCursor(device.id, { lastStatus: 'zk_error', lastError: msg });
    return {
      deviceId: device.id,
      deviceName: device.name,
      status: 'zk_error',
      pulled: 0,
      pushed,
      queued: 0,
      message: msg,
    };
  }

  pulled = records.length;
  const fresh = records
    .filter((r) => r.deviceUserId && r.deviceUserId !== '0')
    .filter((r) => Number(r.userSn) > device.lastEventLogId)
    .map(translateZkRecord);

  if (fresh.length === 0) {
    await finishCycle(cycleId, {
      eventsPolled: pulled,
      eventsPushed: pushed,
      eventsQueued: 0,
      status: 'ok',
    });
    await updateDeviceCursor(device.id, {
      lastStatus: 'ok',
      lastError: null,
      bumpSyncAt: true,
    });
    return {
      deviceId: device.id,
      deviceName: device.name,
      status: 'ok',
      pulled,
      pushed,
      queued: 0,
    };
  }

  // 3. Push fresh events. On failure, enqueue and advance cursor anyway —
  //    C-HR dedupes by (deviceId, eventLogId) so a rare double-send is safe.
  try {
    await pushEvents({ baseUrl: apiUrl, token: device.chrDeviceToken }, fresh);
    pushed += fresh.length;
    const maxSn = Math.max(...fresh.map((e) => Number(e.eventLogId)));
    await finishCycle(cycleId, {
      eventsPolled: pulled,
      eventsPushed: pushed,
      eventsQueued: 0,
      status: 'ok',
    });
    await updateDeviceCursor(device.id, {
      lastEventLogId: maxSn,
      lastStatus: 'ok',
      lastError: null,
      bumpSyncAt: true,
    });
    return {
      deviceId: device.id,
      deviceName: device.name,
      status: 'ok',
      pulled,
      pushed,
      queued: 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await enqueueEvents(
      device.id,
      fresh.map((e) => JSON.stringify(e)),
    );
    queuedNow = fresh.length;
    const maxSn = Math.max(...fresh.map((e) => Number(e.eventLogId)));
    const status = pushed > 0 ? 'partial' : 'chr_error';
    await finishCycle(cycleId, {
      eventsPolled: pulled,
      eventsPushed: pushed,
      eventsQueued: queuedNow,
      status,
      errorMessage: msg,
    });
    await updateDeviceCursor(device.id, {
      lastEventLogId: maxSn,
      lastStatus: status,
      lastError: msg,
    });
    return {
      deviceId: device.id,
      deviceName: device.name,
      status,
      pulled,
      pushed,
      queued: queuedNow,
      message: msg,
    };
  }
}

export async function totalQueuedAcrossDevices(): Promise<number> {
  return countQueuedEvents();
}
