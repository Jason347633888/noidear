CREATE TABLE "management_reviews" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "reviewDate" TIMESTAMP(3),
  "location" TEXT,
  "materialDueDate" TIMESTAMP(3),
  "purpose" TEXT NOT NULL DEFAULT '评审质量和食品安全管理体系的适宜性、充分性和有效性。',
  "scope" JSONB NOT NULL DEFAULT '[]',
  "participants" JSONB NOT NULL DEFAULT '[]',
  "createdBy" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "reportDocumentId" TEXT,
  "reportRecordId" TEXT,
  "meetingMinutesRecordId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "management_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "management_review_inputs" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "department" TEXT,
  "title" TEXT NOT NULL,
  "summary" JSONB NOT NULL,
  "included" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "management_review_inputs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "management_review_actions" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "responsibleDepartment" TEXT NOT NULL,
  "ownerId" TEXT,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'open',
  "verificationNote" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "management_review_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "management_reviews_companyId_year_key" ON "management_reviews"("companyId", "year");
CREATE INDEX "management_reviews_companyId_status_idx" ON "management_reviews"("companyId", "status");
CREATE INDEX "management_reviews_year_idx" ON "management_reviews"("year");
CREATE INDEX "management_reviews_reportDocumentId_idx" ON "management_reviews"("reportDocumentId");
CREATE INDEX "management_reviews_reportRecordId_idx" ON "management_reviews"("reportRecordId");
CREATE INDEX "management_reviews_meetingMinutesRecordId_idx" ON "management_reviews"("meetingMinutesRecordId");
CREATE UNIQUE INDEX "management_review_inputs_reviewId_sourceType_sourceId_key" ON "management_review_inputs"("reviewId", "sourceType", "sourceId");
CREATE INDEX "management_review_inputs_reviewId_sourceType_idx" ON "management_review_inputs"("reviewId", "sourceType");
CREATE INDEX "management_review_actions_reviewId_status_idx" ON "management_review_actions"("reviewId", "status");
CREATE INDEX "management_review_actions_ownerId_idx" ON "management_review_actions"("ownerId");

ALTER TABLE "management_reviews"
  ADD CONSTRAINT "management_reviews_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "management_reviews"
  ADD CONSTRAINT "management_reviews_reportDocumentId_fkey"
  FOREIGN KEY ("reportDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "management_reviews"
  ADD CONSTRAINT "management_reviews_reportRecordId_fkey"
  FOREIGN KEY ("reportRecordId") REFERENCES "records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "management_reviews"
  ADD CONSTRAINT "management_reviews_meetingMinutesRecordId_fkey"
  FOREIGN KEY ("meetingMinutesRecordId") REFERENCES "records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "management_review_inputs"
  ADD CONSTRAINT "management_review_inputs_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "management_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "management_review_actions"
  ADD CONSTRAINT "management_review_actions_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "management_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "management_review_actions"
  ADD CONSTRAINT "management_review_actions_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
