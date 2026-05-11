-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'PAUSED', 'DONE');

-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'EDITOR', 'COMMENTER', 'VIEWER');

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" VARCHAR(63) NOT NULL,
    "color" VARCHAR(9) NOT NULL,
    "scope" VARCHAR(31),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "object_type" VARCHAR(31) NOT NULL,
    "object_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" VARCHAR(127) NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
    "color" VARCHAR(9),
    "icon" VARCHAR(31),
    "task_counter" INTEGER NOT NULL DEFAULT 0,
    "slug" VARCHAR(8) NOT NULL,
    "start_date" DATE,
    "due_date" DATE,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'EDITOR',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_sections" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(63) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "task_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tags_organization_id_deleted_at_idx" ON "tags"("organization_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "tags_organization_id_scope_name_key" ON "tags"("organization_id", "scope", "name");

-- CreateIndex
CREATE INDEX "tag_assignments_organization_id_object_type_object_id_idx" ON "tag_assignments"("organization_id", "object_type", "object_id");

-- CreateIndex
CREATE INDEX "tag_assignments_organization_id_tag_id_idx" ON "tag_assignments"("organization_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "tag_assignments_tag_id_object_type_object_id_key" ON "tag_assignments"("tag_id", "object_type", "object_id");

-- CreateIndex
CREATE INDEX "projects_organization_id_status_archived_at_idx" ON "projects"("organization_id", "status", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organization_id_slug_key" ON "projects"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "task_sections_project_id_order_idx" ON "task_sections"("project_id", "order");

-- AddForeignKey
ALTER TABLE "tag_assignments" ADD CONSTRAINT "tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_sections" ADD CONSTRAINT "task_sections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
