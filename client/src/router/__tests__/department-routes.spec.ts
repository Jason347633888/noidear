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

  it('router does not contain /bootstrap/org route or bootstrap store', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/router/index.ts'), 'utf-8');
    expect(source).not.toContain("/bootstrap/org");
    expect(source).not.toContain('useBootstrapStore');
    expect(source).not.toContain('bootstrapStore.refresh');
    expect(source).not.toContain("to.query.from === 'bootstrap'");
    expect(source).toContain("path: '/login'");
  });

  it('router still contains normal routes', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/router/index.ts'), 'utf-8');
    expect(source).toContain("path: 'departments'");
    expect(source).toContain("path: 'users'");
    expect(source).toContain("path: '/login'");
  });
});
