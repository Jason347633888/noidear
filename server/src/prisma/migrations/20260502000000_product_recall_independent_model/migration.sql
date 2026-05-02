-- CreateTable
CREATE TABLE "product_recalls" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "recall_no" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source_complaint_id" TEXT,
    "source_query_ref" TEXT,
    "source_traceability_snapshot_id" TEXT,
    "requested_by" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "completed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "completion_summary" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recalls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recall_batches" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "recall_id" TEXT NOT NULL,
    "production_batch_id" TEXT NOT NULL,
    "batch_number_snapshot" TEXT NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "affected_qty" DECIMAL(14,4),
    "unit" TEXT,
    "disposition" TEXT,
    "status" TEXT NOT NULL DEFAULT 'identified',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recall_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recall_notifications" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "recall_id" TEXT NOT NULL,
    "external_party_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "notification_method" TEXT NOT NULL DEFAULT 'phone',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notified_at" TIMESTAMP(3),
    "response_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recall_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recall_evidence" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "recall_id" TEXT NOT NULL,
    "evidence_type" TEXT NOT NULL,
    "record_id" TEXT,
    "traceability_snapshot_id" TEXT,
    "external_ref" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_recall_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_recalls_company_id_recall_no_key" ON "product_recalls"("company_id", "recall_no");

-- CreateIndex
CREATE INDEX "product_recalls_company_id_status_idx" ON "product_recalls"("company_id", "status");

-- CreateIndex
CREATE INDEX "product_recalls_company_id_source_complaint_id_idx" ON "product_recalls"("company_id", "source_complaint_id");

-- CreateIndex
CREATE INDEX "product_recalls_source_traceability_snapshot_id_idx" ON "product_recalls"("source_traceability_snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_recall_batches_recall_id_production_batch_id_key" ON "product_recall_batches"("recall_id", "production_batch_id");

-- CreateIndex
CREATE INDEX "product_recall_batches_company_id_production_batch_id_idx" ON "product_recall_batches"("company_id", "production_batch_id");

-- CreateIndex
CREATE INDEX "product_recall_notifications_company_id_recall_id_idx" ON "product_recall_notifications"("company_id", "recall_id");

-- CreateIndex
CREATE INDEX "product_recall_notifications_external_party_id_idx" ON "product_recall_notifications"("external_party_id");

-- CreateIndex
CREATE INDEX "product_recall_evidence_company_id_recall_id_idx" ON "product_recall_evidence"("company_id", "recall_id");

-- CreateIndex
CREATE INDEX "product_recall_evidence_record_id_idx" ON "product_recall_evidence"("record_id");

-- AddForeignKey
ALTER TABLE "product_recalls" ADD CONSTRAINT "product_recalls_source_traceability_snapshot_id_fkey" FOREIGN KEY ("source_traceability_snapshot_id") REFERENCES "traceability_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recall_batches" ADD CONSTRAINT "product_recall_batches_recall_id_fkey" FOREIGN KEY ("recall_id") REFERENCES "product_recalls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recall_batches" ADD CONSTRAINT "product_recall_batches_production_batch_id_fkey" FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recall_notifications" ADD CONSTRAINT "product_recall_notifications_recall_id_fkey" FOREIGN KEY ("recall_id") REFERENCES "product_recalls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recall_notifications" ADD CONSTRAINT "product_recall_notifications_external_party_id_fkey" FOREIGN KEY ("external_party_id") REFERENCES "ExternalParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recall_evidence" ADD CONSTRAINT "product_recall_evidence_recall_id_fkey" FOREIGN KEY ("recall_id") REFERENCES "product_recalls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recall_evidence" ADD CONSTRAINT "product_recall_evidence_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
