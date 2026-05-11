-- CreateTable
CREATE TABLE "task_timers" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "stopped_at" TIMESTAMP(3),
    "minutes" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_timers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_timers_user_id_started_at_idx" ON "task_timers"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "task_timers_task_id_started_at_idx" ON "task_timers"("task_id", "started_at");

-- CreateIndex
CREATE INDEX "task_timers_user_id_stopped_at_idx" ON "task_timers"("user_id", "stopped_at");

-- AddForeignKey
ALTER TABLE "task_timers" ADD CONSTRAINT "task_timers_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_timers" ADD CONSTRAINT "task_timers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
