-- CreateEnum
CREATE TYPE "PreferenceScope" AS ENUM ('USER', 'ORG', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "preferences" (
    "id" TEXT NOT NULL,
    "scope" "PreferenceScope" NOT NULL,
    "scope_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preferences_scope_scope_id_idx" ON "preferences"("scope", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "preferences_scope_scope_id_key_key" ON "preferences"("scope", "scope_id", "key");

-- Backfill: copy non-default User.calendar_default_visibility values into the new generic Preference table.
-- Skip rows that hold the default ('PUBLIC') — registry default already covers them.
INSERT INTO "preferences" ("id", "scope", "scope_id", "key", "value", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    'USER'::"PreferenceScope",
    "id",
    'calendar.visibility',
    jsonb_build_object('value', "calendar_default_visibility"::text),
    now(),
    now()
FROM "users"
WHERE "calendar_default_visibility" IS NOT NULL
  AND "calendar_default_visibility" != 'PUBLIC';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "calendar_default_visibility";
