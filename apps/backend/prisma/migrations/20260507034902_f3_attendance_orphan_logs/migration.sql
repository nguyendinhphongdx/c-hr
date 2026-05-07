-- Allow attendance_logs.employee_id to be NULL — events from device whose
-- employee_code doesn't match an Employee row are stored as orphans and
-- linked retroactively when HR creates the Employee.
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_employee_id_fkey";
ALTER TABLE "attendance_logs" ALTER COLUMN "employee_id" DROP NOT NULL;
ALTER TABLE "attendance_logs"
  ADD CONSTRAINT "attendance_logs_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;

-- Snapshot of the raw employee code from the device payload. Reconcile
-- queries match orphans by (organizationId, employeeCode).
ALTER TABLE "attendance_logs" ADD COLUMN "employee_code" TEXT;

-- CreateIndex
CREATE INDEX "attendance_logs_organization_id_employee_code_idx"
  ON "attendance_logs"("organization_id", "employee_code");
