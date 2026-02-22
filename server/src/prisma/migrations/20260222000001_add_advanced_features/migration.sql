-- TASK-379: 创建文档访问日志表
CREATE TABLE "document_view_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_view_logs_pkey" PRIMARY KEY ("id")
);

-- TASK-379: 创建智能文档推荐表
CREATE TABLE "document_recommendations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_recommendations_pkey" PRIMARY KEY ("id")
);

-- TASK-380: 创建全文搜索索引表
CREATE TABLE "fulltext_indexes" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fulltext_indexes_pkey" PRIMARY KEY ("id")
);

-- TASK-381: 创建审批委托日志表
CREATE TABLE "delegation_logs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "reason" TEXT,
    "delegatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delegation_logs_pkey" PRIMARY KEY ("id")
);

-- TASK-381: 添加 delegatedTo 字段到 workflow_tasks
ALTER TABLE "workflow_tasks" ADD COLUMN "delegatedTo" TEXT;

-- 唯一约束
CREATE UNIQUE INDEX "document_recommendations_userId_documentId_key" ON "document_recommendations"("userId", "documentId");
CREATE UNIQUE INDEX "fulltext_indexes_documentId_key" ON "fulltext_indexes"("documentId");

-- 索引
CREATE INDEX "document_view_logs_userId_viewedAt_idx" ON "document_view_logs"("userId", "viewedAt");
CREATE INDEX "document_view_logs_documentId_idx" ON "document_view_logs"("documentId");
CREATE INDEX "document_recommendations_userId_score_idx" ON "document_recommendations"("userId", "score" DESC);
CREATE INDEX "fulltext_indexes_documentId_idx" ON "fulltext_indexes"("documentId");
CREATE INDEX "delegation_logs_taskId_idx" ON "delegation_logs"("taskId");
CREATE INDEX "delegation_logs_delegatedAt_idx" ON "delegation_logs"("delegatedAt");

-- 外键约束
ALTER TABLE "document_view_logs" ADD CONSTRAINT "document_view_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_view_logs" ADD CONSTRAINT "document_view_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_recommendations" ADD CONSTRAINT "document_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_recommendations" ADD CONSTRAINT "document_recommendations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fulltext_indexes" ADD CONSTRAINT "fulltext_indexes_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delegation_logs" ADD CONSTRAINT "delegation_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "workflow_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delegation_logs" ADD CONSTRAINT "delegation_logs_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delegation_logs" ADD CONSTRAINT "delegation_logs_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
