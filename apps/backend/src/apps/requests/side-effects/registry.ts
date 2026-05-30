/**
 * Side-effect handlers dispatched on Request approve. Keyed by group code.
 *
 * Each handler runs inside the same DB transaction as the status update —
 * a thrown error rolls back the approval. See ADR 0006.
 */
import { Logger } from '@nestjs/common';
import { Prisma, Request } from '@prisma/client';

const logger = new Logger('RequestSideEffects');

export type RequestSideEffectHandler = (
  req: Request,
  tx: Prisma.TransactionClient,
) => Promise<void>;

const HANDLERS: Record<string, RequestSideEffectHandler> = {
  checkin: applyCheckinCorrection,
  checkout: applyCheckoutCorrection,
  // 'leave' has no on-approve side effect for now (deduct leave balance
  // is a future feature — log emitted by service is the only audit trail).
};

export function getHandler(groupCode: string): RequestSideEffectHandler | null {
  return HANDLERS[groupCode] ?? null;
}

// ──────────────────────────────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────────────────────────────

async function applyCheckinCorrection(req: Request, tx: Prisma.TransactionClient): Promise<void> {
  const data = req.data as {
    date: string;
    requestedCheckInAt: string;
    reason?: string;
  };
  const tz = await getOrgTimezone(tx, req.organizationId);
  const date = startOfDayUtc(new Date(data.date));
  const checkInAt = mergeDateAndTimeInTz(data.date, data.requestedCheckInAt, tz);

  await tx.attendanceLog.upsert({
    where: { employeeId_date: { employeeId: req.requesterId, date } },
    create: {
      organizationId: req.organizationId,
      employeeId: req.requesterId,
      date,
      checkInAt,
      source: 'CORRECTION',
      note: data.reason ?? null,
    },
    update: {
      checkInAt,
      source: 'CORRECTION',
      note: data.reason ?? null,
    },
  });

  logger.log(
    `applied checkin correction: employee=${req.requesterId} date=${data.date} time=${data.requestedCheckInAt} tz=${tz}`,
  );
}

async function applyCheckoutCorrection(req: Request, tx: Prisma.TransactionClient): Promise<void> {
  const data = req.data as {
    date: string;
    requestedCheckOutAt: string;
    reason?: string;
  };
  const tz = await getOrgTimezone(tx, req.organizationId);
  const date = startOfDayUtc(new Date(data.date));
  const checkOutAt = mergeDateAndTimeInTz(data.date, data.requestedCheckOutAt, tz);

  await tx.attendanceLog.upsert({
    where: { employeeId_date: { employeeId: req.requesterId, date } },
    create: {
      organizationId: req.organizationId,
      employeeId: req.requesterId,
      date,
      checkOutAt,
      source: 'CORRECTION',
      note: data.reason ?? null,
    },
    update: {
      checkOutAt,
      source: 'CORRECTION',
      note: data.reason ?? null,
    },
  });

  logger.log(
    `applied checkout correction: employee=${req.requesterId} date=${data.date} time=${data.requestedCheckOutAt} tz=${tz}`,
  );
}

// ──────────────────────────────────────────────────────────────────────
// Utils
// ──────────────────────────────────────────────────────────────────────

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function getOrgTimezone(tx: Prisma.TransactionClient, orgId: string): Promise<string> {
  const org = await tx.organization.findUnique({
    where: { id: orgId },
    select: { timezone: true },
  });
  return org?.timezone || 'UTC';
}

/**
 * Combine "YYYY-MM-DD" + "HH:MM[:SS]" into a UTC `Date` interpreting the
 * input as wall-clock in the given IANA timezone. Algorithm:
 *
 *   1. Build a "naive UTC" Date as if the input were already UTC.
 *   2. Format that instant back into the target timezone — the wall-clock
 *      string returned tells us how far off we are from the intended one.
 *   3. Shift the original instant by the difference.
 *
 * Works for any fixed-offset timezone (e.g. Asia/Ho_Chi_Minh UTC+7);
 * adequate for DST timezones since side-effect inputs are bounded to a
 * single day, but a date library should replace this if multi-day DST
 * accuracy ever matters.
 */
function mergeDateAndTimeInTz(date: string, time: string, timezone: string): Date {
  const t = time.length === 5 ? `${time}:00` : time;
  const asIfUtc = new Date(`${date}T${t}Z`);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(asIfUtc);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  const tzLocalIso = `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}Z`;
  const targetIso = `${date}T${t}Z`;
  const diff = new Date(targetIso).getTime() - new Date(tzLocalIso).getTime();
  return new Date(asIfUtc.getTime() + diff);
}
