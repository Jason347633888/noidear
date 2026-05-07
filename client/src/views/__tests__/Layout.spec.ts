import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('Layout.vue menuItems static check', () => {
  it('仓库管理菜单组包含 /warehouse/batches 入口', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/navigation/menu.ts'),
      'utf-8',
    );

    expect(source).toContain("path: '/warehouse/batches'");
  });
});

describe('Layout navigation grouping', () => {
  it('places execution inbox entries ahead of management views', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/navigation/menu.ts'),
      'utf-8',
    );

    expect(source).toContain("title: '工作执行'");
    expect(source).toContain("path: '/dashboard'");
    expect(source).toContain("path: '/my-todos'");
    expect(source).toContain("path: '/record-tasks/my'");
    expect(source).toContain("path: '/approvals/pending'");
    expect(source).toContain("path: '/approvals/history'");
    expect(source).toContain("title: '系统管理'");
  });
});

describe('Layout shell primitives', () => {
  it('references shared shell primitives instead of page-local headings only', () => {
    const layoutSource = readFileSync(
      resolve(process.cwd(), 'src/views/Layout.vue'),
      'utf-8',
    );
    const styleSource = readFileSync(
      resolve(process.cwd(), 'src/styles/index.css'),
      'utf-8',
    );

    expect(layoutSource).toContain('app-shell');
    expect(styleSource).toContain('--shell-bg');
    expect(styleSource).toContain('.app-page-header');
    expect(styleSource).toContain('.app-panel');
  });
});
