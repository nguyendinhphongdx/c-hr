/*
  Warnings:

  - The values [GENERIC] on the enum `DeviceBrand` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeviceBrand_new" AS ENUM ('ZKTECO', 'HIKVISION', 'SUPREMA', 'OTHER');
ALTER TABLE "attendance_devices" ALTER COLUMN "brand" DROP DEFAULT;
ALTER TABLE "attendance_devices" ALTER COLUMN "brand" TYPE "DeviceBrand_new" USING ("brand"::text::"DeviceBrand_new");
ALTER TYPE "DeviceBrand" RENAME TO "DeviceBrand_old";
ALTER TYPE "DeviceBrand_new" RENAME TO "DeviceBrand";
DROP TYPE "DeviceBrand_old";
COMMIT;

-- AlterTable
ALTER TABLE "attendance_devices" ALTER COLUMN "brand" DROP DEFAULT;
