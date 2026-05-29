-- AlterTable
ALTER TABLE "traceability_snapshots" ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "readinessReasons" JSONB,
ADD COLUMN     "readinessStatus" TEXT NOT NULL DEFAULT 'complete',
ADD COLUMN     "rootObjectId" TEXT,
ADD COLUMN     "rootObjectType" TEXT,
ADD COLUMN     "snapshotData" JSONB,
ADD COLUMN     "snapshotPurpose" TEXT NOT NULL DEFAULT 'evidence_export';

-- CreateTable
CREATE TABLE "evidence_files" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceItemId" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileHash" TEXT,
    "mimeType" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_exports" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "templateVersion" TEXT,
    "exportScope" TEXT NOT NULL DEFAULT 'main_chain_evidence',
    "dataSnapshot" JSONB NOT NULL,
    "approvalSnapshot" JSONB,
    "attachmentIndex" JSONB,
    "summaryFormat" TEXT NOT NULL DEFAULT 'pdf',
    "fileId" TEXT,
    "exportedById" TEXT,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_files_company_id_resourceType_resourceId_idx" ON "evidence_files"("company_id", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "evidence_exports_company_id_resourceType_resourceId_idx" ON "evidence_exports"("company_id", "resourceType", "resourceId");

