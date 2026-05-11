-- CreateEnum
CREATE TYPE "AssigneeRole" AS ENUM ('HR', 'MANAGER', 'EMPLOYEE', 'IT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OnboardingPlanStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OnboardingTaskStatus" AS ENUM ('TODO', 'DONE');

-- CreateTable
CREATE TABLE "onboarding_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" VARCHAR(127) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "onboarding_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_template_tasks" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "default_assignee_role" "AssigneeRole" NOT NULL DEFAULT 'HR',
    "default_assignee_user_id" TEXT,
    "due_offset_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_template_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "template_name_snapshot" VARCHAR(127) NOT NULL,
    "status" "OnboardingPlanStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "template_task_id" TEXT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assignee_id" TEXT NOT NULL,
    "due_date" DATE,
    "status" "OnboardingTaskStatus" NOT NULL DEFAULT 'TODO',
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "completed_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_templates_organization_id_is_active_deleted_at_idx" ON "onboarding_templates"("organization_id", "is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "onboarding_template_tasks_template_id_order_idx" ON "onboarding_template_tasks"("template_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_plans_employee_id_key" ON "onboarding_plans"("employee_id");

-- CreateIndex
CREATE INDEX "onboarding_plans_organization_id_status_idx" ON "onboarding_plans"("organization_id", "status");

-- CreateIndex
CREATE INDEX "onboarding_tasks_plan_id_order_idx" ON "onboarding_tasks"("plan_id", "order");

-- CreateIndex
CREATE INDEX "onboarding_tasks_assignee_id_status_idx" ON "onboarding_tasks"("assignee_id", "status");

-- AddForeignKey
ALTER TABLE "onboarding_template_tasks" ADD CONSTRAINT "onboarding_template_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "onboarding_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_plans" ADD CONSTRAINT "onboarding_plans_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "onboarding_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_plans" ADD CONSTRAINT "onboarding_plans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "onboarding_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
