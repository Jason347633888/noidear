-- CreateTable
CREATE TABLE "calibration_point_readings" (
    "id" TEXT NOT NULL,
    "calibration_record_id" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "standard_value" DECIMAL(14,4) NOT NULL,
    "measured_value" DECIMAL(14,4) NOT NULL,
    "tolerance" DECIMAL(14,4),
    "error_value" DECIMAL(14,4),
    "judgment" TEXT NOT NULL,
    "evidence_file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calibration_point_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calibration_point_readings_calibration_record_id_idx" ON "calibration_point_readings"("calibration_record_id");

-- AddForeignKey
ALTER TABLE "calibration_point_readings" ADD CONSTRAINT "calibration_point_readings_calibration_record_id_fkey" FOREIGN KEY ("calibration_record_id") REFERENCES "CalibrationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
