-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'FILLED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'FREELANCE');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "JobStageKind" AS ENUM ('SOURCED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CandidateSource" AS ENUM ('MANUAL', 'REFERRAL', 'TOPCV', 'ITVIEC', 'TALENT_VN', 'CAREER_PAGE', 'OTHER');

-- AlterEnum
ALTER TYPE "AppCode" ADD VALUE 'RECRUITMENT';

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" VARCHAR(127) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "benefits" TEXT,
    "department_id" TEXT,
    "hiring_manager_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "job_type" "JobType" NOT NULL,
    "work_mode" "WorkMode" NOT NULL,
    "work_addresses" JSONB NOT NULL DEFAULT '[]',
    "experience_min" INTEGER,
    "experience_max" INTEGER,
    "salary_min" DECIMAL(15,2),
    "salary_max" DECIMAL(15,2),
    "salary_negotiable" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "required_skills" TEXT[],
    "nice_to_have_skills" TEXT[],
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_stages" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "kind" "JobStageKind" NOT NULL,
    "name" VARCHAR(127) NOT NULL,
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "headline" TEXT,
    "location" TEXT,
    "linkedin_url" TEXT,
    "source" "CandidateSource" NOT NULL DEFAULT 'MANUAL',
    "source_meta" JSONB,
    "user_id" TEXT,
    "employee_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_resumes" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" VARCHAR(127) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "parsed_meta" JSONB,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "resume_id" TEXT,
    "coverLetter" TEXT,
    "expected_salary" DECIMAL(15,2),
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejected_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "external_id" TEXT,
    "external_source" "CandidateSource",
    "stage_history" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "holidays_organization_id_date_deleted_at_idx" ON "holidays"("organization_id", "date", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_organization_id_date_key" ON "holidays"("organization_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");

-- CreateIndex
CREATE INDEX "jobs_organization_id_status_idx" ON "jobs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "jobs_organization_id_department_id_idx" ON "jobs"("organization_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_organization_id_code_key" ON "jobs"("organization_id", "code");

-- CreateIndex
CREATE INDEX "job_stages_job_id_order_idx" ON "job_stages"("job_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_user_id_key" ON "candidates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_employee_id_key" ON "candidates"("employee_id");

-- CreateIndex
CREATE INDEX "candidates_organization_id_source_idx" ON "candidates"("organization_id", "source");

-- CreateIndex
CREATE INDEX "candidates_organization_id_deleted_at_idx" ON "candidates"("organization_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_organization_id_email_key" ON "candidates"("organization_id", "email");

-- CreateIndex
CREATE INDEX "candidate_resumes_candidate_id_is_active_idx" ON "candidate_resumes"("candidate_id", "is_active");

-- CreateIndex
CREATE INDEX "applications_organization_id_stage_id_idx" ON "applications"("organization_id", "stage_id");

-- CreateIndex
CREATE INDEX "applications_organization_id_job_id_idx" ON "applications"("organization_id", "job_id");

-- CreateIndex
CREATE INDEX "applications_external_source_external_id_idx" ON "applications"("external_source", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidate_id_job_id_key" ON "applications"("candidate_id", "job_id");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_hiring_manager_id_fkey" FOREIGN KEY ("hiring_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_stages" ADD CONSTRAINT "job_stages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_resumes" ADD CONSTRAINT "candidate_resumes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "job_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "candidate_resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
