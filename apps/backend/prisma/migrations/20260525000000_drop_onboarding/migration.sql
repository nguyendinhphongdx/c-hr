-- Drop F10 Onboarding foundation. Reverses 20260511072301_f10_onboarding_foundation.
-- Tables dropped in dependency order (children → parents). Enums dropped last.

-- DropForeignKey
ALTER TABLE "onboarding_tasks" DROP CONSTRAINT IF EXISTS "onboarding_tasks_plan_id_fkey";
ALTER TABLE "onboarding_plans" DROP CONSTRAINT IF EXISTS "onboarding_plans_template_id_fkey";
ALTER TABLE "onboarding_plans" DROP CONSTRAINT IF EXISTS "onboarding_plans_employee_id_fkey";
ALTER TABLE "onboarding_template_tasks" DROP CONSTRAINT IF EXISTS "onboarding_template_tasks_template_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "onboarding_tasks";
DROP TABLE IF EXISTS "onboarding_plans";
DROP TABLE IF EXISTS "onboarding_template_tasks";
DROP TABLE IF EXISTS "onboarding_templates";

-- DropEnum
DROP TYPE IF EXISTS "OnboardingTaskStatus";
DROP TYPE IF EXISTS "OnboardingPlanStatus";
DROP TYPE IF EXISTS "AssigneeRole";
