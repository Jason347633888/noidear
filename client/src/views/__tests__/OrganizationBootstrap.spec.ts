import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('OrganizationBootstrap static checks', () => {
  it('view file contains bootstrap steps', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/bootstrap/OrganizationBootstrap.vue'),
      'utf-8',
    );
    expect(source).toContain('el-steps');
    expect(source).toContain('system_role_baseline');
    expect(source).toContain('departments');
    expect(source).toContain('department_manager');
    expect(source).toContain('department_members');
  });

  it('view file uses bootstrap store', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/bootstrap/OrganizationBootstrap.vue'),
      'utf-8',
    );
    expect(source).toContain('useBootstrapStore');
    expect(source).toContain('bootstrapStore.refresh');
  });

  it('router redirects to /bootstrap/org when bootstrap incomplete', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/router/index.ts'), 'utf-8');
    expect(source).toContain('/bootstrap/org');
    expect(source).toContain('bootstrapStore.completed');
  });
});
