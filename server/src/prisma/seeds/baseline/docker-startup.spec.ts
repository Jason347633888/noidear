import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('server Docker startup baseline', () => {
  it('runs migrations, compiled baseline seed, then starts Nest', () => {
    const source = readFileSync(resolve(process.cwd(), 'Dockerfile'), 'utf-8');
    expect(source).toContain('npx prisma migrate deploy --schema=src/prisma/schema.prisma');
    expect(source).toContain('node dist/prisma/seed-baseline.js');
    expect(source).toContain('node dist/main');
    expect(source).not.toContain('prisma:seed:baseline');
  });
});
