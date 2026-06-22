-- Drop per-Org Entra config table — SSO config moves to env (shared
-- multi-tenant Microsoft app pattern). SsoLink stays (per-User binding
-- to Entra account is still needed regardless of where config lives).

ALTER TABLE "org_sso_configs" DROP CONSTRAINT IF EXISTS "org_sso_configs_organization_id_fkey";
DROP TABLE IF EXISTS "org_sso_configs";
