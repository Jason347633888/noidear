-- Link customer complaints to ExternalParty customers while preserving legacy customer_name snapshots.
-- Historical complaints may keep NULL customer_id until a business-confirmed data cleanup maps them.

ALTER TABLE "CustomerComplaint"
  ADD COLUMN IF NOT EXISTS "customer_id" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CustomerComplaint" cc
    LEFT JOIN "ExternalParty" ep ON ep."id" = cc."customer_id"
    WHERE cc."customer_id" IS NOT NULL
      AND ep."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add CustomerComplaint.customer_id FK: orphan customer_id rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CustomerComplaint" cc
    JOIN "ExternalParty" ep ON ep."id" = cc."customer_id"
    WHERE cc."customer_id" IS NOT NULL
      AND ep."party_type" <> 'customer'
  ) THEN
    RAISE EXCEPTION 'Cannot add CustomerComplaint.customer_id FK: non-customer ExternalParty rows are referenced';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CustomerComplaint_customer_id_idx"
  ON "CustomerComplaint"("customer_id");

ALTER TABLE "CustomerComplaint" DROP CONSTRAINT IF EXISTS "CustomerComplaint_customer_id_fkey";
ALTER TABLE "CustomerComplaint"
  ADD CONSTRAINT "CustomerComplaint_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "ExternalParty"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
