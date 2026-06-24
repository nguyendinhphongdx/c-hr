-- AlterTable
ALTER TABLE "employees" ADD COLUMN "attendance_code" TEXT;

-- Preserve existing device matching for active employees only.
-- Soft-deleted rows keep NULL so recycled codes don't block the unique index.
UPDATE "employees" SET "attendance_code" = "code" WHERE "deleted_at" IS NULL;

-- CreateIndex — partial: skip NULL values and soft-deleted rows so that a
-- recycled attendance_code on a soft-deleted employee never blocks re-use.
CREATE UNIQUE INDEX "employees_organization_id_attendance_code_key"
ON "employees"("organization_id", "attendance_code")
WHERE "attendance_code" IS NOT NULL AND "deleted_at" IS NULL;
