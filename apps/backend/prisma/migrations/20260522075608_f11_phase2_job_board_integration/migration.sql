-- CreateEnum
CREATE TYPE "JobBoard" AS ENUM ('TOPCV', 'ITVIEC', 'TALENT_VN');

-- CreateEnum
CREATE TYPE "PostingSyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CLOSED');

-- CreateTable
CREATE TABLE "job_board_integrations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "board" "JobBoard" NOT NULL,
    "credentials_encrypted" TEXT NOT NULL,
    "webhook_secret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_board_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_board_postings" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "external_url" TEXT,
    "last_sync_status" "PostingSyncStatus" NOT NULL DEFAULT 'PENDING',
    "last_sync_error" TEXT,
    "published_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_board_postings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_board_integrations_organization_id_board_key" ON "job_board_integrations"("organization_id", "board");

-- CreateIndex
CREATE UNIQUE INDEX "job_board_postings_job_id_integration_id_key" ON "job_board_postings"("job_id", "integration_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_board_postings_integration_id_external_id_key" ON "job_board_postings"("integration_id", "external_id");

-- AddForeignKey
ALTER TABLE "job_board_integrations" ADD CONSTRAINT "job_board_integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_board_postings" ADD CONSTRAINT "job_board_postings_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_board_postings" ADD CONSTRAINT "job_board_postings_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "job_board_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
