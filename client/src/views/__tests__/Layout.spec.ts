import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('Layout.vue menuItems static check', () => {
  it('仓库管理菜单组包含 /warehouse/batches 入口', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/Layout.vue'),
      'utf-8',
    );

    expect(source).toContain("'/warehouse/batches'");
  });
});
