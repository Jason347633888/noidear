import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { parseAllForms } from './parse-vault-forms';

const prisma = new PrismaClient();

async function main() {
  const templates = parseAllForms();
  console.log(`解析到 ${templates.length} 个表单模板`);

  if (templates.length === 0) {
    console.log('未找到可解析的表单，退出');
    return;
  }

  let upserted = 0;
  for (const t of templates) {
    const fieldsJson = {
      sections: [
        {
          title: '表单内容',
          fields: t.fields.map((f) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            ...(f.unit ? { unit: f.unit } : {}),
            ...(f.defaultValue ? { defaultValue: f.defaultValue } : {}),
          })),
        },
      ],
    };

    try {
      await prisma.recordTemplate.upsert({
        where: { code: t.code },
        update: {
          name: t.name,
          fieldsJson,
          retentionYears: t.retentionYears,
        },
        create: {
          code: t.code,
          name: t.name,
          fieldsJson,
          retentionYears: t.retentionYears,
          description: `${t.department} — ${path.basename(t.rawPath)}`,
          status: 'active',
        },
      });
      upserted++;
    } catch (err) {
      console.error(`跳过 ${t.code} (${t.name}):`, (err as Error).message);
    }
  }

  console.log(`导入完成，共 upsert ${upserted} 个模板`);
}

main()
  .catch((err) => {
    console.error('种子脚本执行失败:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
