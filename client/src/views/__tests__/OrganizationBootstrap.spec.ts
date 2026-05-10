import { existsSync } from 'fs';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

describe('OrganizationBootstrap removal checks', () => {
  it('wizard view file is deleted', () => {
    const filePath = resolve(process.cwd(), 'src/views/bootstrap/OrganizationBootstrap.vue');
    expect(existsSync(filePath)).toBe(false);
  });

  it('bootstrap store is deleted', () => {
    const filePath = resolve(process.cwd(), 'src/stores/bootstrap.ts');
    expect(existsSync(filePath)).toBe(false);
  });

  it('bootstrap api wrapper is deleted', () => {
    const filePath = resolve(process.cwd(), 'src/api/bootstrap.ts');
    expect(existsSync(filePath)).toBe(false);
  });

  it('router does not reference bootstrap/org or bootstrap store', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/router/index.ts'), 'utf-8');
    expect(source).not.toContain('/bootstrap/org');
    expect(source).not.toContain('bootstrapStore.completed');
    expect(source).not.toContain('useBootstrapStore');
  });
});
