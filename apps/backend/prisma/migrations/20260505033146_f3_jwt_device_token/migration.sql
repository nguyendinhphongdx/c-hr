-- Drop bcrypt-token + sha256-lookup columns; replace with a token version
-- counter for revocation. Plaintext token is now a JWT signed by the server
-- (see attendance-device.service.ts); device row no longer stores any hash.

-- DropIndex
DROP INDEX IF EXISTS "attendance_devices_token_lookup_key";

-- DropColumn
ALTER TABLE "attendance_devices" DROP COLUMN "token_lookup";
ALTER TABLE "attendance_devices" DROP COLUMN "token";

-- AddColumn
ALTER TABLE "attendance_devices" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
