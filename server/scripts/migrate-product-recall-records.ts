import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RECALL_TEMPLATE_CODES = [
  'GRSS-YX-JL-02',
  'GRSS-YX-JL-03',
  'GRSS-YX-JL-04',
  'GRSS-YX-JL-05',
];

async function main() {
  const records = await prisma.record.findMany({
    where: {
      template: { code: { in: RECALL_TEMPLATE_CODES } },
      deletedAt: null,
    },
    include: {
      template: { select: { code: true, name: true } },
      productionBatch: {
        select: { id: true, batchNumber: true, productName: true },
      },
    },
  });

  console.log(`Found ${records.length} recall-related records to migrate`);

  for (const record of records) {
    const companyId = record.createdBy;

    const recallCount = await prisma.productRecall.count({ where: { company_id: companyId } });
    const recall_no = `RC-HIST-${new Date().getFullYear()}-${String(recallCount + 1).padStart(4, '0')}`;

    const recall = await prisma.productRecall.create({
      data: {
        company_id: companyId,
        recall_no,
        title: `历史记录迁移: ${record.number}`,
        reason: `动态表单记录 ${record.template.code} 迁移`,
        status: 'draft',
        requested_by: record.createdBy,
      },
    });

    await prisma.productRecallEvidence.create({
      data: {
        company_id: companyId,
        recall_id: recall.id,
        evidence_type: 'record',
        record_id: record.id,
        title: `${record.template.name} - ${record.number}`,
      },
    });

    if (record.productionBatch) {
      const existingBatch = await prisma.productRecallBatch.findFirst({
        where: { recall_id: recall.id, production_batch_id: record.productionBatch.id },
      });

      if (!existingBatch) {
        await prisma.productRecallBatch.create({
          data: {
            company_id: companyId,
            recall_id: recall.id,
            production_batch_id: record.productionBatch.id,
            batch_number_snapshot: record.productionBatch.batchNumber,
            product_name_snapshot: record.productionBatch.productName,
          },
        });
      }
    }

    console.log(`Migrated record ${record.number} -> recall ${recall.recall_no}`);
  }

  console.log('Migration complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
