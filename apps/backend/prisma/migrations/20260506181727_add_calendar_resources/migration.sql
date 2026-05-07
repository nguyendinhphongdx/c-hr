-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('ROOM', 'EQUIPMENT', 'VEHICLE');

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" "ResourceKind" NOT NULL,
    "name" VARCHAR(127) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(255),
    "capacity" INTEGER,
    "color" VARCHAR(7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "managing_department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_resources" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_name_snapshot" VARCHAR(127),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resources_organization_id_kind_is_active_idx" ON "resources"("organization_id", "kind", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "resources_organization_id_name_key" ON "resources"("organization_id", "name");

-- CreateIndex
CREATE INDEX "event_resources_resource_id_idx" ON "event_resources"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_resources_event_id_resource_id_key" ON "event_resources"("event_id", "resource_id");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_managing_department_id_fkey" FOREIGN KEY ("managing_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
