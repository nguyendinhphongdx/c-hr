-- Migration: work_schedule_flexible_mode
-- Replaces is_default with effectiveFrom (timeline-based schedule resolution).
-- Replaces lateGraceMinutes column with mode enum + config JSONB per-shift.

-- 1. Enum for attendance mode
CREATE TYPE "AttendanceMode" AS ENUM ('FIXED', 'FLEXIBLE');

-- 2. WorkSchedule: drop is_default, add effective_from
ALTER TABLE "work_schedules" DROP COLUMN "is_default";
ALTER TABLE "work_schedules" ADD COLUMN "effective_from" TIMESTAMP(3);
DROP INDEX IF EXISTS "work_schedules_organization_id_is_default_idx";
CREATE INDEX "work_schedules_organization_id_effective_from_idx"
  ON "work_schedules"("organization_id", "effective_from");

-- 3. WorkShift: add new columns before dropping old
ALTER TABLE "work_shifts"
  ADD COLUMN "mode"   "AttendanceMode" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "config" JSONB            NOT NULL DEFAULT '{}';

-- 4. Data migration: move late_grace_minutes into config JSON
UPDATE "work_shifts"
SET "config" = jsonb_build_object('lateGraceMinutes', "late_grace_minutes");

-- 5. Now safe to drop old column
ALTER TABLE "work_shifts" DROP COLUMN "late_grace_minutes";
