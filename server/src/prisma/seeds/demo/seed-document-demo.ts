import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SERVER_ROOT = resolve(__dirname, '../../../..');

export async function seedDocumentDemo() {
  await execFileAsync(
    'npx',
    ['ts-node', 'scripts/import-vault-system-documents.ts', '--apply'],
    {
      cwd: SERVER_ROOT,
      env: {
        ...process.env,
        DOCUMENT_VAULT_ROOT: process.env.DOCUMENT_VAULT_ROOT || '/seed/document-vault',
      },
    },
  );
}
