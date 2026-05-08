import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SERVER_ROOT = resolve(__dirname, '../../../..');

export async function seedOpsDemo() {
  await execFileAsync('npx', ['ts-node', 'scripts/seed-test-data.ts'], {
    cwd: SERVER_ROOT,
    env: process.env,
  });
}
