import type { ZkAttendanceRecord } from './types';

interface ZKLibInstance {
  createSocket(): Promise<void>;
  getAttendances(): Promise<{ data: ZkAttendanceRecord[] }>;
  disconnect(): Promise<void>;
  getSerialNumber?(): Promise<string>;
  getDeviceName?(): Promise<string>;
  getDeviceVersion?(): Promise<string>;
  getMacAddress?(): Promise<string>;
  getInfo?(): Promise<{ userCounts?: number; logCounts?: number }>;
}

type ZKLibCtor = new (
  host: string,
  port: number,
  timeout: number,
  inport: number,
) => ZKLibInstance;

const ZKLib: ZKLibCtor = require('node-zklib');

export async function fetchAttendances(
  host: string,
  port: number,
): Promise<ZkAttendanceRecord[]> {
  const zk = new ZKLib(host, port, 10_000, 4_000);
  await zk.createSocket();
  try {
    const res = await zk.getAttendances();
    return res?.data ?? [];
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // best-effort cleanup
    }
  }
}

export interface ZkDeviceInfo {
  reachable: boolean;
  name?: string;
  serial?: string;
  version?: string;
  mac?: string;
  userCount?: number;
  attendanceCount?: number;
  error?: string;
}

/**
 * Open a real ZK protocol session and ask the device to identify itself.
 * Used after the TCP-only LAN scan to enrich each candidate IP with model /
 * serial / firmware so the admin can pick the right one. Each metadata call
 * is wrapped in try/catch — older firmware revisions may not implement all
 * of them, but we still want to return whatever did succeed.
 */
export async function probeZkDevice(
  host: string,
  port: number,
  timeoutMs = 3_000,
): Promise<ZkDeviceInfo> {
  const zk = new ZKLib(host, port, timeoutMs, 4_000);
  try {
    await zk.createSocket();
  } catch (err) {
    return { reachable: false, error: err instanceof Error ? err.message : String(err) };
  }
  const info: ZkDeviceInfo = { reachable: true };
  try {
    if (zk.getSerialNumber) info.serial = await zk.getSerialNumber();
  } catch {
    // ignore — older firmwares may not implement this
  }
  try {
    if (zk.getDeviceName) info.name = await zk.getDeviceName();
  } catch {
    // ignore
  }
  try {
    if (zk.getDeviceVersion) info.version = await zk.getDeviceVersion();
  } catch {
    // ignore
  }
  try {
    if (zk.getMacAddress) info.mac = await zk.getMacAddress();
  } catch {
    // ignore
  }
  try {
    if (zk.getInfo) {
      const stats = await zk.getInfo();
      info.userCount = stats?.userCounts;
      info.attendanceCount = stats?.logCounts;
    }
  } catch {
    // ignore
  }
  try {
    await zk.disconnect();
  } catch {
    // best-effort
  }
  return info;
}
