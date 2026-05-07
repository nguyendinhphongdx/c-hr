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
  const date = startOfDayUtc(new Date(data.date));
  const checkInAt = mergeDateAndTime(data.date, data.requestedCheckInAt);

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
    `applied checkin correction: employee=${req.requesterId} date=${data.date} time=${data.requestedCheckInAt}`,
  );
}

async function applyCheckoutCorrection(req: Request, tx: Prisma.TransactionClient): Promise<void> {
  const data = req.data as {
    date: string;
    requestedCheckOutAt: string;
    reason?: string;
  };
  const date = startOfDayUtc(new Date(data.date));
  const checkOutAt = mergeDateAndTime(data.date, data.requestedCheckOutAt);

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
    `applied checkout correction: employee=${req.requesterId} date=${data.date} time=${data.requestedCheckOutAt}`,
  );
}

// ──────────────────────────────────────────────────────────────────────
// Utils
// ──────────────────────────────────────────────────────────────────────

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Combine "YYYY-MM-DD" + "HH:MM[:SS]" into a Date. Treat the time as
 * local wall-clock; convert to UTC for storage.
 */
function mergeDateAndTime(date: string, time: string): Date {
  const t = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${t}`);
}
