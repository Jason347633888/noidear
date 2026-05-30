-- Phase 15 Task 7: GarmentInventory + LaundryWorkRecord + LaundryWorkRecordItem
-- Adds garment inventory tracking and laundry/disinfection work records.

-- GarmentInventory: tracks stock of washable garments per company/area
CREATE TABLE "garment_inventories" (
    "id"           TEXT NOT NULL,
    "company_id"   TEXT NOT NULL,
    "code"         TEXT NOT NULL,
    "garment_type" TEXT NOT NULL,
    "area_id"      TEXT,
    "quantity"     INTEGER NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'active',
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garment_inventories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "garment_inventories_company_id_code_key"
    ON "garment_inventories"("company_id", "code");

CREATE INDEX "garment_inventories_company_id_garment_type_status_idx"
    ON "garment_inventories"("company_id", "garment_type", "status");

-- LaundryWorkRecord: header record for one laundry/disinfection session
CREATE TABLE "laundry_work_records" (
    "id"                  TEXT NOT NULL,
    "company_id"          TEXT NOT NULL,
    "work_date"           DATE NOT NULL,
    "shift_type_id"       TEXT,
    "batch_no"            TEXT,
    "washing_method"      TEXT,
    "disinfection_method" TEXT,
    "disinfectant"        TEXT,
    "temperature"         DECIMAL(8, 2),
    "duration_min"        INTEGER,
    "operator_id"         TEXT,
    "verifier_id"         TEXT,
    "status"              TEXT NOT NULL DEFAULT 'draft',
    "notes"               TEXT,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laundry_work_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "laundry_work_records_company_id_work_date_status_idx"
    ON "laundry_work_records"("company_id", "work_date", "status");

-- LaundryWorkRecordItem: one garment-category row per record
CREATE TABLE "laundry_work_record_items" (
    "id"                     TEXT NOT NULL,
    "laundry_work_record_id" TEXT NOT NULL,
    "garment_type"           TEXT NOT NULL,
    "garment_inventory_id"   TEXT,
    "area_id"                TEXT,
    "quantity"               INTEGER NOT NULL,
    "action"                 TEXT NOT NULL,
    "result"                 TEXT NOT NULL,
    "notes"                  TEXT,
    "evidence_file_id"       TEXT,
    "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laundry_work_record_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "laundry_work_record_items_laundry_work_record_id_idx"
    ON "laundry_work_record_items"("laundry_work_record_id");

CREATE INDEX "laundry_work_record_items_garment_inventory_id_idx"
    ON "laundry_work_record_items"("garment_inventory_id");

-- FK: LaundryWorkRecordItem → LaundryWorkRecord (cascade delete)
ALTER TABLE "laundry_work_record_items"
    ADD CONSTRAINT "laundry_work_record_items_laundry_work_record_id_fkey"
    FOREIGN KEY ("laundry_work_record_id") REFERENCES "laundry_work_records"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: LaundryWorkRecordItem → GarmentInventory (set null on delete)
ALTER TABLE "laundry_work_record_items"
    ADD CONSTRAINT "laundry_work_record_items_garment_inventory_id_fkey"
    FOREIGN KEY ("garment_inventory_id") REFERENCES "garment_inventories"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
