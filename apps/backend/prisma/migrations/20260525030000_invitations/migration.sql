-- Unified Invitation entity — covers both ADMIN_INVITE (push, magic
-- link) and SELF_REQUEST (pull, SSO orphan asking to join).

-- CreateEnum
CREATE TYPE "InvitationKind" AS ENUM ('ADMIN_INVITE', 'SELF_REQUEST');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(255),
    "kind" "InvitationKind" NOT NULL,
    "invite_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "invited_by_id" TEXT,
    "external_user_id" VARCHAR(255),
    "message" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_invite_token_key" ON "invitations"("invite_token");

-- CreateIndex
CREATE INDEX "invitations_organization_id_status_created_at_idx" ON "invitations"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "invitations_email_status_idx" ON "invitations"("email", "status");

-- CreateIndex
CREATE INDEX "invitations_kind_status_idx" ON "invitations"("kind", "status");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
