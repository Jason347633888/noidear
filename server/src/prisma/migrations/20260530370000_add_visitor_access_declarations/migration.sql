-- Phase 15 Task 5: VisitorRecord + VisitorAccessDeclaration join
-- Drops the old id-based visitor_access_declarations table and replaces it
-- with a composite-PK version that also carries declaration_type.
-- Adds check_in_time and exit_time to visitor_records.

-- Step 1: Drop old join table (cascade removes foreign keys and indexes)
DROP TABLE IF EXISTS "visitor_access_declarations";

-- Step 2: Add check_in_time and exit_time to visitor_records
ALTER TABLE "visitor_records" ADD COLUMN IF NOT EXISTS "check_in_time" TIMESTAMP(3);
ALTER TABLE "visitor_records" ADD COLUMN IF NOT EXISTS "exit_time" TIMESTAMP(3);

-- Step 3: Create new join table with composite PK and declaration_type
CREATE TABLE "visitor_access_declarations" (
    "visitor_record_id"     TEXT NOT NULL,
    "access_declaration_id" TEXT NOT NULL,
    "declaration_type"      TEXT NOT NULL,

    CONSTRAINT "visitor_access_declarations_pkey"
        PRIMARY KEY ("visitor_record_id", "access_declaration_id")
);

-- Step 4: Indexes
CREATE INDEX "visitor_access_declarations_visitor_record_id_idx"
    ON "visitor_access_declarations"("visitor_record_id");

CREATE INDEX "visitor_access_declarations_access_declaration_id_idx"
    ON "visitor_access_declarations"("access_declaration_id");

-- Step 5: Foreign keys
ALTER TABLE "visitor_access_declarations"
    ADD CONSTRAINT "visitor_access_declarations_visitor_record_id_fkey"
    FOREIGN KEY ("visitor_record_id") REFERENCES "visitor_records"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "visitor_access_declarations"
    ADD CONSTRAINT "visitor_access_declarations_access_declaration_id_fkey"
    FOREIGN KEY ("access_declaration_id") REFERENCES "access_declarations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
