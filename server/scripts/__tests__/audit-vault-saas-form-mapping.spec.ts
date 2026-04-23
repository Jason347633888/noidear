import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { auditVaultSaasMapping } from '../audit-vault-saas-form-mapping';

describe('auditVaultSaasMapping', () => {
  it('reports forms missing from SaaS mapping', () => {
    const root = mkdtempSync(join(tmpdir(), 'noidear-audit-'));
    const vault = join(root, 'vault');
    const saas = join(root, 'saas');
    mkdirSync(join(vault, '产品开发部'), { recursive: true });
    mkdirSync(saas, { recursive: true });

    writeFileSync(
      join(vault, '产品开发部', '新产品开发申请书.md'),
      '# 新产品开发申请书\n\n编号：GRSS-KF-JL-09\n\n| 字段 | 要求 |\n| --- | --- |\n| 开发产品名称 | 必填 |\n',
    );
    writeFileSync(
      join(saas, '03-字段映射表-产品开发部.md'),
      '| 表单 | 编号 | 字段 |\n| --- | --- | --- |\n| 新产品开发计划书 | GRSS-KF-JL-10 | 产品名称 |\n',
    );

    const result = auditVaultSaasMapping(vault, saas);

    expect(result.totalVaultForms).toBe(1);
    expect(result.missingInSaas[0].formName).toBe('新产品开发申请书');
  });
});
