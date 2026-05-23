-- Task 46: Add ownership FK fields for OwnershipScope filters
-- Models: Equipment, MaintenancePlan, NonConformance, CustomerComplaint, MaterialRequisition

-- Equipment: add responsiblePersonId FK
ALTER TABLE "equipment"
  ADD COLUMN IF NOT EXISTS "responsiblePersonId" TEXT;

ALTER TABLE "equipment"
  ADD CONSTRAINT "equipment_responsiblePersonId_fkey"
  FOREIGN KEY ("responsiblePersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "equipment_responsiblePersonId_idx" ON "equipment"("responsiblePersonId");

-- MaintenancePlan: add responsiblePersonId FK
ALTER TABLE "maintenance_plans"
  ADD COLUMN IF NOT EXISTS "responsiblePersonId" TEXT;

ALTER TABLE "maintenance_plans"
  ADD CONSTRAINT "maintenance_plans_responsiblePersonId_fkey"
  FOREIGN KEY ("responsiblePersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "maintenance_plans_responsiblePersonId_idx" ON "maintenance_plans"("responsiblePersonId");

-- NonConformance: add discoveredById FK
ALTER TABLE "NonConformance"
  ADD COLUMN IF NOT EXISTS "discoveredById" TEXT;

ALTER TABLE "NonConformance"
  ADD CONSTRAINT "NonConformance_discoveredById_fkey"
  FOREIGN KEY ("discoveredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "NonConformance_discoveredById_idx" ON "NonConformance"("discoveredById");

-- CustomerComplaint: add createdById FK
ALTER TABLE "CustomerComplaint"
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

ALTER TABLE "CustomerComplaint"
  ADD CONSTRAINT "CustomerComplaint_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CustomerComplaint_createdById_idx" ON "CustomerComplaint"("createdById");

-- MaterialRequisition: add applicantId FK constraint (column already exists as plain String)
-- First check if the FK constraint already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'material_requisitions_applicantId_fkey'
      AND table_name = 'material_requisitions'
  ) THEN
    ALTER TABLE "material_requisitions"
      ADD CONSTRAINT "material_requisitions_applicantId_fkey"
      FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "material_requisitions_applicantId_idx" ON "material_requisitions"("applicantId");

-- Backfill: best-effort name match for responsiblePersonId (equipment)
UPDATE "equipment" eq
SET "responsiblePersonId" = u.id
FROM "users" u
WHERE u.name = eq."responsiblePerson"
  AND eq."responsiblePersonId" IS NULL;

-- Backfill: best-effort name match for responsiblePersonId (maintenance_plans)
UPDATE "maintenance_plans" mp
SET "responsiblePersonId" = u.id
FROM "users" u
WHERE u.name = mp."responsiblePerson"
  AND mp."responsiblePersonId" IS NULL;

-- Backfill: best-effort name match for discoveredById (NonConformance)
UPDATE "NonConformance" nc
SET "discoveredById" = u.id
FROM "users" u
WHERE u.name = nc."discovered_by"
  AND nc."discoveredById" IS NULL;
