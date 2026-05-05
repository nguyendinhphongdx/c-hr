-- AddColumn
ALTER TABLE "attendance_devices" ADD COLUMN "token_lookup" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "attendance_devices_token_lookup_key" ON "attendance_devices"("token_lookup");
