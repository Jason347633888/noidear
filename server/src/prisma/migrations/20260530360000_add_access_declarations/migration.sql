-- CreateTable
CREATE TABLE "access_declarations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "declaration_type" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT,
    "subject_snapshot" JSONB,
    "declaration_content" JSONB NOT NULL,
    "declared_by" TEXT,
    "declared_at" TIMESTAMP(3) NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approval_conclusion" TEXT,
    "approval_opinion" TEXT,
    "evidence_file_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'declared',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_access_declarations" (
    "id" TEXT NOT NULL,
    "visitor_record_id" TEXT NOT NULL,
    "access_declaration_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_access_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_declarations_company_id_declaration_type_status_idx" ON "access_declarations"("company_id", "declaration_type", "status");

-- CreateIndex
CREATE INDEX "access_declarations_subject_type_subject_id_idx" ON "access_declarations"("subject_type", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_access_declarations_visitor_record_id_access_declar_key" ON "visitor_access_declarations"("visitor_record_id", "access_declaration_id");

-- CreateIndex
CREATE INDEX "visitor_access_declarations_visitor_record_id_idx" ON "visitor_access_declarations"("visitor_record_id");

-- CreateIndex
CREATE INDEX "visitor_access_declarations_access_declaration_id_idx" ON "visitor_access_declarations"("access_declaration_id");

-- AddForeignKey
ALTER TABLE "visitor_access_declarations" ADD CONSTRAINT "visitor_access_declarations_visitor_record_id_fkey" FOREIGN KEY ("visitor_record_id") REFERENCES "visitor_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_access_declarations" ADD CONSTRAINT "visitor_access_declarations_access_declaration_id_fkey" FOREIGN KEY ("access_declaration_id") REFERENCES "access_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
