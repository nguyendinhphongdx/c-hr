-- CreateEnum
CREATE TYPE "DeviceBrand" AS ENUM ('GENERIC', 'ZKTECO', 'HIKVISION', 'SUPREMA', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('DEVICE', 'CORRECTION', 'MANUAL_HR');

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_shifts" (
    "id" TEXT NOT NULL,
    "work_schedule_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "days_of_week" INTEGER[],
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "late_grace_minutes" INTEGER NOT NULL DEFAULT 15,
    "crosses_midnight" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_devices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand" "DeviceBrand" NOT NULL DEFAULT 'GENERIC',
    "serial" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip_address" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "check_in_at" TIMESTAMP(3),
    "check_out_at" TIMESTAMP(3),
    "source" "AttendanceSource" NOT NULL,
    "device_id" TEXT,
    "event_log_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_schedules_organization_id_is_default_idx" ON "work_schedules"("organization_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_devices_organization_id_serial_key" ON "attendance_devices"("organization_id", "serial");

-- CreateIndex
CREATE INDEX "attendance_logs_organization_id_date_idx" ON "attendance_logs"("organization_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_employee_id_date_key" ON "attendance_logs"("employee_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_device_id_event_log_id_key" ON "attendance_logs"("device_id", "event_log_id");

-- AddForeignKey
ALTER TABLE "work_shifts" ADD CONSTRAINT "work_shifts_work_schedule_id_fkey" FOREIGN KEY ("work_schedule_id") REFERENCES "work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "attendance_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
