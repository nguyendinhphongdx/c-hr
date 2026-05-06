-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('DEFAULT', 'PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "AttendeeResponse" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "EventProvider" AS ENUM ('LOCAL', 'GOOGLE', 'MICROSOFT');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title" VARCHAR(511) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(1023),
    "conference_url" VARCHAR(1023),
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'CONFIRMED',
    "visibility" "EventVisibility" NOT NULL DEFAULT 'DEFAULT',
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "color" VARCHAR(7),
    "provider" "EventProvider" NOT NULL DEFAULT 'LOCAL',
    "external_id" VARCHAR(255),
    "external_etag" VARCHAR(127),
    "ical_uid" VARCHAR(511),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" VARCHAR(127),
    "display_name" VARCHAR(127),
    "response" "AttendeeResponse" NOT NULL DEFAULT 'PENDING',
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "is_organizer" BOOLEAN NOT NULL DEFAULT false,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_organization_id_start_at_end_at_idx" ON "events"("organization_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "events_owner_id_start_at_idx" ON "events"("owner_id", "start_at");

-- CreateIndex
CREATE INDEX "events_provider_external_id_idx" ON "events"("provider", "external_id");

-- CreateIndex
CREATE INDEX "events_ical_uid_idx" ON "events"("ical_uid");

-- CreateIndex
CREATE INDEX "event_attendees_user_id_response_idx" ON "event_attendees"("user_id", "response");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendees_event_id_user_id_key" ON "event_attendees"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendees_event_id_email_key" ON "event_attendees"("event_id", "email");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
