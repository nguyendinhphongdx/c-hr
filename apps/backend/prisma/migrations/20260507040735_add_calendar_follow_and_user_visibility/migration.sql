-- AlterEnum
ALTER TYPE "EventVisibility" ADD VALUE 'BUSY_ONLY';

-- DropForeignKey
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_employee_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "calendar_default_visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "calendar_follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "followed_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_follows_follower_id_idx" ON "calendar_follows"("follower_id");

-- CreateIndex
CREATE INDEX "calendar_follows_followed_id_idx" ON "calendar_follows"("followed_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_follows_follower_id_followed_id_key" ON "calendar_follows"("follower_id", "followed_id");

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_follows" ADD CONSTRAINT "calendar_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_follows" ADD CONSTRAINT "calendar_follows_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
