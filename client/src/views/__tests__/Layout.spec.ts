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
  it('contains final group titles in correct order', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/navigation/menu.ts'),
      'utf-8',
    );

    expect(source).toContain("title: '工作执行'");
    expect(source).toContain("title: '生产执行'");
    expect(source).toContain("title: '系统治理'");

    const execIdx = source.indexOf("title: '工作执行'");
    const govIdx = source.indexOf("title: '系统治理'");
    expect(execIdx).toBeLessThan(govIdx);
  });

  it('places execution inbox entries correctly', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/navigation/menu.ts'),
      'utf-8',
    );

    expect(source).toContain("path: '/dashboard'");
    expect(source).toContain("path: '/my-todos'");
    expect(source).toContain("path: '/approvals/pending'");
    expect(source).toContain("path: '/approvals/history'");
    // /record-tasks/my was removed during dynamic form retirement
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

  it('Layout.vue does not declare a local color palette', () => {
    const layoutSource = readFileSync(
      resolve(process.cwd(), 'src/views/Layout.vue'),
      'utf-8',
    );

    expect(layoutSource).not.toContain('--primary:');
    expect(layoutSource).not.toContain('--accent:');
    expect(layoutSource).not.toContain('--menu-hover:');
  });
});
