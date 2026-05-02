CREATE TABLE "business_number_sequences" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "current_value" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_number_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_number_sequences_company_id_scope_period_key"
  ON "business_number_sequences"("company_id", "scope", "period");

CREATE INDEX "business_number_sequences_scope_period_idx"
  ON "business_number_sequences"("scope", "period");
