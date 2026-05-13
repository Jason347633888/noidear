import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('product R&D menu', () => {
  it('keeps only product information and R&D process list in the visible menu source', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/navigation/menu.ts'), 'utf8');
    const productSection = source.slice(source.indexOf("title: '产品研发'"), source.indexOf("title: '生产管理'"));
    expect(productSection).toContain("title: '产品信息'");
    expect(productSection).toContain("title: '研发流程列表'");
    expect(productSection).not.toContain('配方管理');
    expect(productSection).not.toContain('工序步骤管理');
  });
});
