/*
  Warnings:

  - You are about to drop the `attendance_corrections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leave_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "attendance_corrections" DROP CONSTRAINT "attendance_corrections_approver_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_corrections" DROP CONSTRAINT "attendance_corrections_requester_id_fkey";

-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_approver_id_fkey";

-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_requester_id_fkey";

-- DropTable
DROP TABLE "attendance_corrections";

-- DropTable
DROP TABLE "leave_requests";

-- DropEnum
DROP TYPE "LeaveType";

-- CreateTable
CREATE TABLE "request_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields_schema" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "approver_id" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "data" JSONB NOT NULL,
    "decision_note" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "request_groups_code_key" ON "request_groups"("code");

-- CreateIndex
CREATE INDEX "requests_organization_id_requester_id_idx" ON "requests"("organization_id", "requester_id");

-- CreateIndex
CREATE INDEX "requests_organization_id_approver_id_status_idx" ON "requests"("organization_id", "approver_id", "status");

-- CreateIndex
CREATE INDEX "requests_organization_id_group_id_status_idx" ON "requests"("organization_id", "group_id", "status");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "request_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
