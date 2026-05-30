-- Phase 14 Task 2: Add traceability drill workflow table

CREATE TABLE IF NOT EXISTS "traceability_drills" (
  "id"                       TEXT NOT NULL,
  "company_id"               TEXT NOT NULL,
  "drill_type"               TEXT NOT NULL,
  "drill_date"               DATE NOT NULL,
  "planned_start"            TIMESTAMP(3),
  "planned_end"              TIMESTAMP(3),
  "actual_start"             TIMESTAMP(3),
  "actual_end"               TIMESTAMP(3),
  "simulated_case"           TEXT,
  "root_object_type"         TEXT NOT NULL,
  "root_object_id"           TEXT NOT NULL,
  "traceability_snapshot_id" TEXT,
  "participants"             TEXT[] NOT NULL DEFAULT '{}',
  "reviewer_id"              TEXT,
  "approver_id"              TEXT,
  "conclusion"               TEXT,
  "conclusion_at"            TIMESTAMP(3),
  "capa_id"                  TEXT,
  "status"                   TEXT NOT NULL DEFAULT 'planned',
  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "traceability_drills_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "traceability_drills_company_id_drill_date_status_idx"
  ON "traceability_drills"("company_id", "drill_date", "status");

CREATE INDEX IF NOT EXISTS "traceability_drills_root_object_type_root_object_id_idx"
  ON "traceability_drills"("root_object_type", "root_object_id");
