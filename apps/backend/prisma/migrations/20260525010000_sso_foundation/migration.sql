-- SSO foundation (Phase 1: OIDC via Microsoft Entra ID).

-- CreateEnum
CREATE TYPE "SsoProvider" AS ENUM ('ENTRA');

-- CreateTable
CREATE TABLE "org_sso_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" "SsoProvider" NOT NULL DEFAULT 'ENTRA',
    "tenant_id" VARCHAR(255) NOT NULL,
    "client_id" VARCHAR(255) NOT NULL,
    "client_secret_enc" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_sso_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_links" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "SsoProvider" NOT NULL,
    "external_user_id" VARCHAR(255) NOT NULL,
    "external_email" VARCHAR(320),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_sso_configs_organization_id_key" ON "org_sso_configs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sso_links_user_id_provider_key" ON "sso_links"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "sso_links_provider_external_user_id_key" ON "sso_links"("provider", "external_user_id");

-- AddForeignKey
ALTER TABLE "org_sso_configs" ADD CONSTRAINT "org_sso_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_links" ADD CONSTRAINT "sso_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
