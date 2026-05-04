import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { isAppAdmin } from '@/common/auth/access';
import { RequestUser } from '@/common/types';
import { PrismaService } from '@libs/database/prisma.service';

import {
  AttendanceEventDto,
  CreateAttendanceDeviceDto,
  PushAttendanceDto,
  UpdateAttendanceDeviceDto,
} from './dto';
import { AttendanceDeviceRepository } from './attendance-device.repository';

const TOKEN_BYTES = 32;
const BCRYPT_ROUNDS = 10;

export interface PushSummary {
  accepted: number;
  duplicates: number;
  unknownEmployees: string[];
}

@Injectable()
export class AttendanceDeviceService {
  private readonly logger = new Logger(AttendanceDeviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AttendanceDeviceRepository,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Admin-side CRUD (HRM appadmin)
  // ──────────────────────────────────────────────────────────────────

  async list(currentUser: RequestUser) {
    const orgId = this.requireOrg(currentUser);
    return this.repo.findManyByOrg(orgId);
  }

  async findOne(currentUser: RequestUser, id: string) {
    const orgId = this.requireOrg(currentUser);
    const dev = await this.repo.findByIdByOrg(orgId, id);
    if (!dev) throw new NotFoundException('Device not found');
    return dev;
  }

  async create(currentUser: RequestUser, dto: CreateAttendanceDeviceDto) {
    const orgId = this.requireOrg(currentUser);
    await this.requireHrmAppAdmin(currentUser, orgId);

    const plaintext = generateToken();
    const tokenHash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);

    const device = await this.repo.create({
      organizationId: orgId,
      name: dto.name,
      serial: dto.serial,
      brand: dto.brand,
      ipAddress: dto.ipAddress,
      token: tokenHash,
    });

    // Plaintext returned ONLY here. Save it on the device side; we won't
    // surface it again.
    return { device, token: plaintext };
  }

  async update(currentUser: RequestUser, id: string, dto: UpdateAttendanceDeviceDto) {
    const orgId = this.requireOrg(currentUser);
    await this.requireHrmAppAdmin(currentUser, orgId);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Device not found');

    return this.repo.update(id, {
      name: dto.name ?? undefined,
      isActive: dto.isActive ?? undefined,
      ipAddress: dto.ipAddress,
    });
  }

  async regenerateToken(currentUser: RequestUser, id: string) {
    const orgId = this.requireOrg(currentUser);
    await this.requireHrmAppAdmin(currentUser, orgId);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Device not found');

    const plaintext = generateToken();
    const tokenHash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);
    const device = await this.repo.update(id, { token: tokenHash });
    return { device, token: plaintext };
  }

  async remove(currentUser: RequestUser, id: string) {
    const orgId = this.requireOrg(currentUser);
    await this.requireHrmAppAdmin(currentUser, orgId);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Device not found');
    await this.repo.delete(id);
    return { id, success: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // Public push endpoint — auth via deviceId + token
  // ──────────────────────────────────────────────────────────────────

  /**
   * Verify token, resolve employees by code within the device's Org, and
   * upsert AttendanceLog rows day-by-day. Idempotent via unique
   * (deviceId, eventLogId): a replayed push of the same event is a no-op.
   */
  async push(dto: PushAttendanceDto): Promise<PushSummary> {
    const device = await this.repo.findByIdRaw(dto.deviceId);
    if (!device || !device.isActive) {
      // Return the same generic error for missing / disabled devices to
      // avoid leaking which devices exist.
      throw new UnauthorizedException('Invalid device or token');
    }
    const ok = await bcrypt.compare(dto.token, device.token);
    if (!ok) throw new UnauthorizedException('Invalid device or token');

    // Resolve all employee codes in this push to ids in one query.
    const codes = Array.from(new Set(dto.events.map((e) => e.employeeCode)));
    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId: device.organizationId,
        code: { in: codes },
        deletedAt: null,
      },
      select: { id: true, code: true },
    });
    const codeToId = new Map(employees.map((e) => [e.code, e.id]));

    const summary: PushSummary = {
      accepted: 0,
      duplicates: 0,
      unknownEmployees: [],
    };

    for (const event of dto.events) {
      const empId = codeToId.get(event.employeeCode);
      if (!empId) {
        if (!summary.unknownEmployees.includes(event.employeeCode)) {
          summary.unknownEmployees.push(event.employeeCode);
        }
        continue;
      }

      const result = await this.applyEvent(
        device.id,
        device.organizationId,
        empId,
        event,
      );
      if (result === 'accepted') summary.accepted++;
      else if (result === 'duplicate') summary.duplicates++;
    }

    await this.repo.update(device.id, { lastSeenAt: new Date() });
    if (summary.unknownEmployees.length > 0) {
      this.logger.warn(
        `[device=${device.id}] dropped events for unknown employee codes: ${summary.unknownEmployees.join(', ')}`,
      );
    }
    return summary;
  }

  /**
   * One event = one row update for that (employee, date). On replay (same
   * deviceId+eventLogId) returns 'duplicate' and leaves the row alone.
   */
  private async applyEvent(
    deviceId: string,
    organizationId: string,
    employeeId: string,
    event: AttendanceEventDto,
  ): Promise<'accepted' | 'duplicate'> {
    const ts = new Date(event.timestamp);
    const dateOnly = new Date(
      Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate()),
    );

    return this.prisma.$transaction(async (tx) => {
      // Idempotency guard. We check before write to avoid overwriting an
      // existing row on retry.
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

      const existing = await tx.attendanceLog.findUnique({
        where: { employeeId_date: { employeeId, date: dateOnly } },
      });

      if (!existing) {
        await tx.attendanceLog.create({
          data: {
            organizationId,
            employeeId,
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

      // Row exists from an earlier event today: extend the window.
      const newCheckIn =
        existing.checkInAt && existing.checkInAt < ts ? existing.checkInAt : ts;
      const newCheckOut =
        existing.checkOutAt && existing.checkOutAt > ts ? existing.checkOutAt : ts;

      await tx.attendanceLog.update({
        where: { id: existing.id },
        data: {
          checkInAt: newCheckIn,
          checkOutAt: newCheckOut,
          // Keep the earliest deviceId/eventLogId so the unique pair stays
          // stable; replays of *this* eventLogId are caught above. Latest
          // event id is recorded only if the row had none.
          deviceId: existing.deviceId ?? deviceId,
          eventLogId: existing.eventLogId ?? event.eventLogId,
        },
      });
      return 'accepted';
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private requireOrg(user: RequestUser): string {
    if (!user.organizationId) {
      throw new ForbiddenException('Current user is not attached to an organization');
    }
    return user.organizationId;
  }

  private async requireHrmAppAdmin(user: RequestUser, orgId: string) {
    const ok = await isAppAdmin(user, 'HRM', orgId, this.prisma);
    if (!ok) throw new ForbiddenException('Need HRM appadmin or admin role');
  }
}

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}
