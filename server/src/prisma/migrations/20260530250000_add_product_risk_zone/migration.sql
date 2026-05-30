-- CreateTable
CREATE TABLE "product_risk_zones" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "risk_zone" TEXT NOT NULL,
    "basis" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "approvalInstanceId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_risk_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_risk_zones_company_id_product_id_status_idx" ON "product_risk_zones"("company_id", "product_id", "status");
