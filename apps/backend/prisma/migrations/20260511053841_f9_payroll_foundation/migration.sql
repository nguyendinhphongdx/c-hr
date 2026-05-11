-- CreateEnum
CREATE TYPE "RegionTier" AS ENUM ('REGION_I', 'REGION_II', 'REGION_III', 'REGION_IV');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'CLOSED', 'PAID');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "base_salary" DECIMAL(15,2),
ADD COLUMN     "bhxh_code" VARCHAR(20),
ADD COLUMN     "dependents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "region" "RegionTier" NOT NULL DEFAULT 'REGION_I',
ADD COLUMN     "tax_code" VARCHAR(10);

-- CreateTable
CREATE TABLE "payroll_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "personal_deduction" DECIMAL(15,2) NOT NULL,
    "dependent_deduction" DECIMAL(15,2) NOT NULL,
    "region_min_wage_json" JSONB NOT NULL,
    "insurance_cap_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "bhxh_rate" DECIMAL(5,2) NOT NULL DEFAULT 8,
    "bhyt_rate" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "bhtn_rate" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "ot_rates_json" JSONB NOT NULL,
    "tax_brackets_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "month_key" VARCHAR(7) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "closed_at" TIMESTAMP(3),
    "closed_by_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by_id" TEXT,
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "base_salary" DECIMAL(15,2) NOT NULL,
    "dependents" INTEGER NOT NULL,
    "region" "RegionTier" NOT NULL,
    "standard_workdays" INTEGER NOT NULL,
    "actual_workdays" DECIMAL(5,2) NOT NULL,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "ot_minutes_weekday" INTEGER NOT NULL DEFAULT 0,
    "ot_minutes_weekend" INTEGER NOT NULL DEFAULT 0,
    "ot_minutes_holiday" INTEGER NOT NULL DEFAULT 0,
    "allowances_json" JSONB NOT NULL,
    "deductions_json" JSONB NOT NULL,
    "gross_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "insurable_base" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bhxh_employee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bhyt_employee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bhtn_employee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "insurance_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxable_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "compute_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_configs_organization_id_year_key" ON "payroll_configs"("organization_id", "year");

-- CreateIndex
CREATE INDEX "payroll_periods_organization_id_status_idx" ON "payroll_periods"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_organization_id_month_key_key" ON "payroll_periods"("organization_id", "month_key");

-- CreateIndex
CREATE INDEX "payroll_items_organization_id_employee_id_idx" ON "payroll_items"("organization_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_items_period_id_employee_id_key" ON "payroll_items"("period_id", "employee_id");

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
