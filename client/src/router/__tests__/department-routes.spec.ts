import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('department route and menu static check', () => {
  it('router contains /departments route', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/router/index.ts'), 'utf-8');
    expect(source).toContain("path: 'departments'");
    expect(source).toContain("name: 'Departments'");
  });

  it('navigation menu contains 部门管理 menu item', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/navigation/menu.ts'), 'utf-8');
    expect(source).toContain("'/departments'");
    expect(source).toContain('部门管理');
  });

  it('初始化未完成时登录后跳转到 /bootstrap/org（路由存在静态检查）', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/router/index.ts'), 'utf-8');
    expect(source).toContain('/bootstrap/org');
    expect(source).toContain('OrganizationBootstrap');
  });
});
