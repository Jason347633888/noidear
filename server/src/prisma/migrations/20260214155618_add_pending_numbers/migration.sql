-- CreateTable
CREATE TABLE "pending_numbers" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "departmentId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_numbers_level_departmentId_number_key" ON "pending_numbers"("level", "departmentId", "number");

-- AddForeignKey
ALTER TABLE "pending_numbers" ADD CONSTRAINT "pending_numbers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
