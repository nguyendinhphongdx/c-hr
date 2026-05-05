import type { ID, ISODate, Nullable } from "@/lib/types";

export type DeviceBrand = "ZKTECO" | "HIKVISION" | "SUPREMA" | "OTHER";

export interface AttendanceDevice {
  id: ID;
  organizationId: ID;
  brand: DeviceBrand;
  serial: string;
  name: string;
  ipAddress: Nullable<string>;
  lastSeenAt: Nullable<ISODate>;
  isActive: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface CreateDeviceInput {
  name: string;
  serial: string;
  brand: DeviceBrand;
  ipAddress?: string;
}

export interface UpdateDeviceInput {
  name?: string;
  isActive?: boolean;
  ipAddress?: Nullable<string>;
}

export interface CreateDeviceResponse {
  device: AttendanceDevice;
  /** Plaintext, returned ONCE. Save it on the device side. */
  token: string;
}
