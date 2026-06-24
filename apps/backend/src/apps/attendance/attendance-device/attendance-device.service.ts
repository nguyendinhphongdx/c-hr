import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import authConfig from '@/config/auth.config';
import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import {
  AttendanceEventDto,
  CreateAttendanceDeviceDto,
  PingDeviceDto,
  PushAttendanceDto,
  UpdateAttendanceDeviceDto,
} from './dto';
import { AttendanceDeviceRepository } from './attendance-device.repository';

const JWT_AUDIENCE = 'attendance-device';

interface DeviceTokenPayload {
  sub: string;
  v: number;
}

export interface PushSummary {
  /** Events stored with a known employee row. */
  accepted: number;
  /** Events skipped because (deviceId, eventLogId) was already stored. */
  duplicates: number;
  /** Events stored as orphan (employeeId=null) — pending reconcile when HR
   *  creates the Employee with that code. */
  pending: number;
  /** Distinct employee codes that didn't match a current Employee row. */
  unknownEmployees: string[];
}

@Injectable()
export class AttendanceDeviceService {
  private readonly logger = new Logger(AttendanceDeviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: AttendanceDeviceRepository,
    private readonly jwt: JwtService,
    @Inject(authConfig.KEY)
    private readonly auth: ConfigType<typeof authConfig>,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Admin-side CRUD (HRM appadmin)
  // ──────────────────────────────────────────────────────────────────

  async list() {
    const orgId = this.ctx.requireOrg();
    return this.repo.findManyByOrg(orgId);
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const dev = await this.repo.findByIdByOrg(orgId, id);
    if (!dev) throw new NotFoundException('Device not found');
    return dev;
  }

  async create(dto: CreateAttendanceDeviceDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const device = await this.repo.create({
      organizationId: orgId,
      name: dto.name,
      serial: dto.serial,
      brand: dto.brand,
      ipAddress: dto.ipAddress,
    });

    return { device, token: this.signToken(device.id, device.version) };
  }

  async update(id: string, dto: UpdateAttendanceDeviceDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Device not found');

    return this.repo.update(id, {
      name: dto.name ?? undefined,
      isActive: dto.isActive ?? undefined,
      ipAddress: dto.ipAddress,
    });
  }

  /**
   * Re-sign the *current* JWT for this device. No state change. Lets admins
   * recover the token at any time without rotating it (no "show once").
   */
  async getToken(id: string): Promise<{ token: string }> {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Device not found');
    return { token: this.signToken(existing.id, existing.version) };
  }

  /**
   * Bump version → invalidates every JWT minted for this device so far. Then
   * sign + return a fresh one. Use when a token is suspected leaked.
   */
  async regenerateToken(id: string) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Device not found');

    const device = await this.repo.update(id, { version: { increment: 1 } });
    return { device, token: this.signToken(device.id, device.version) };
  }

  async remove(id: string) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Device not found');
    await this.repo.delete(id);
    return { id, success: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // Public push endpoint — auth via JWT in body
  // ──────────────────────────────────────────────────────────────────

  /**
   * Connectivity check — the bridge calls this when the admin clicks
   * "Connect" on a device row. Verifies the JWT and bumps `lastSeenAt` so
   * the dashboard reflects "kết nối thành công" immediately.
   */
  async ping(dto: PingDeviceDto): Promise<{ deviceId: string; lastSeenAt: Date }> {
    const device = await this.verifyToken(dto.token);
    const updated = await this.repo.update(device.id, { lastSeenAt: new Date() });
    return { deviceId: device.id, lastSeenAt: updated.lastSeenAt ?? new Date() };
  }

  /**
   * Verify token, resolve employees by attendance code within the device's Org, and
   * upsert AttendanceLog rows day-by-day. Idempotent via unique
   * (deviceId, eventLogId): a replayed push of the same event is a no-op.
   *
   * Events whose employeeCode does NOT match Employee.attendanceCode are
   * still persisted (employeeId=null, employeeCode=<raw>). Reconciled
   * automatically when HR creates the Employee — see linkPendingAttendance.
   */
  async push(dto: PushAttendanceDto): Promise<PushSummary> {
    const device = await this.verifyToken(dto.token);

    // Resolve all employee codes in this push to ids in one query.
    const codes = Array.from(new Set(dto.events.map((e) => e.employeeCode)));
    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId: device.organizationId,
        attendanceCode: { in: codes },
        deletedAt: null,
      },
      select: { id: true, attendanceCode: true },
    });
    const codeToId = new Map(
      employees.flatMap((employee) =>
        employee.attendanceCode ? [[employee.attendanceCode, employee.id] as const] : [],
      ),
    );

    const summary: PushSummary = {
      accepted: 0,
      duplicates: 0,
      pending: 0,
      unknownEmployees: [],
    };

    for (const event of dto.events) {
      const empId = codeToId.get(event.employeeCode);
      const result = await this.applyEvent(device.id, device.organizationId, empId, event);
      if (result === 'accepted') summary.accepted++;
      else if (result === 'duplicate') summary.duplicates++;
      else if (result === 'pending') {
        summary.pending++;
        if (!summary.unknownEmployees.includes(event.employeeCode)) {
          summary.unknownEmployees.push(event.employeeCode);
        }
      }
    }

    await this.repo.update(device.id, { lastSeenAt: new Date() });
    if (summary.unknownEmployees.length > 0) {
      this.logger.log(
        `[device=${device.id}] stored ${summary.pending} orphan event(s) for unknown employee codes: ${summary.unknownEmployees.join(', ')} — will be linked when those employees are created`,
      );
    }
    return summary;
  }

  // ──────────────────────────────────────────────────────────────────
  // Token helpers
  // ──────────────────────────────────────────────────────────────────

  private signToken(deviceId: string, version: number): string {
    return this.jwt.sign({ sub: deviceId, v: version } satisfies DeviceTokenPayload, {
      secret: this.auth.jwtDeviceSecret,
      audience: JWT_AUDIENCE,
    });
  }

  /**
   * Decode + verify JWT, then check the version counter against the row.
   * Returns the device row on success; throws Unauthorized otherwise.
   * Errors are intentionally generic — do not leak whether deviceId existed
   * vs. signature was invalid vs. version was stale.
   */
  private async verifyToken(token: string) {
    let payload: DeviceTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<DeviceTokenPayload>(token, {
        secret: this.auth.jwtDeviceSecret,
        audience: JWT_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    if (!payload?.sub || typeof payload.v !== 'number') {
      throw new UnauthorizedException('Invalid token');
    }
    const device = await this.repo.findByIdRaw(payload.sub);
    if (!device || !device.isActive || device.version !== payload.v) {
      throw new UnauthorizedException('Invalid token');
    }
    return device;
  }

  /**
   * Apply one event:
   *   - Replay (same deviceId+eventLogId) → 'duplicate', no-op
   *   - Known employeeId → merge into the (employee, date) row (MIN/MAX
   *     window) → 'accepted'
   *   - Unknown employeeId → standalone orphan row with employeeCode set
   *     for later reconcile → 'pending'
   */
  private async applyEvent(
    deviceId: string,
    organizationId: string,
    employeeId: string | undefined,
    event: AttendanceEventDto,
  ): Promise<'accepted' | 'duplicate' | 'pending'> {
    const ts = new Date(event.timestamp);
    const dateOnly = new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate()));

    return this.prisma.$transaction(async (tx) => {
      const replay = await tx.attendanceLog.findUnique({
        where: {
          deviceId_eventLogId: {
            deviceId,
            eventLogId: event.eventLogId,
          },
        },
        select: { id: true },
      });
      if (replay) return 'duplicate';

      if (!employeeId) {
        // Orphan event — Postgres treats NULL employeeId as distinct in the
        // unique constraint, so multiple orphan rows can coexist on the same
        // date. They get merged into a single (employee, date) row at
        // reconcile time.
        await tx.attendanceLog.create({
          data: {
            organizationId,
            employeeId: null,
            employeeCode: event.employeeCode,
            date: dateOnly,
            checkInAt: ts,
            checkOutAt: ts,
            source: 'DEVICE',
            deviceId,
            eventLogId: event.eventLogId,
            note: event.note,
          },
        });
        return 'pending';
      }

      const existing = await tx.attendanceLog.findUnique({
        where: { employeeId_date: { employeeId, date: dateOnly } },
      });

      if (!existing) {
        await tx.attendanceLog.create({
          data: {
            organizationId,
            employeeId,
            employeeCode: event.employeeCode,
            date: dateOnly,
            checkInAt: ts,
            checkOutAt: ts,
            source: 'DEVICE',
            deviceId,
            eventLogId: event.eventLogId,
            note: event.note,
          },
        });
        return 'accepted';
      }

      const newCheckIn = existing.checkInAt && existing.checkInAt < ts ? existing.checkInAt : ts;
      const newCheckOut =
        existing.checkOutAt && existing.checkOutAt > ts ? existing.checkOutAt : ts;

      await tx.attendanceLog.update({
        where: { id: existing.id },
        data: {
          checkInAt: newCheckIn,
          checkOutAt: newCheckOut,
          deviceId: existing.deviceId ?? deviceId,
          eventLogId: existing.eventLogId ?? event.eventLogId,
        },
      });
      return 'accepted';
    });
  }
}
