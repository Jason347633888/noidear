import * as fs from 'fs';
import * as path from 'path';
import { ApprovalCallbackRegistry } from './approval-callback.registry';

const seedFiles = [
  path.resolve(__dirname, '../../prisma/seed.ts'),
  path.resolve(__dirname, '../../prisma/seed-e2e.ts'),
];

const retainedCallbackKeys = [
  'document.approvalApproved',
  'document.approvalRejected',
  'process.stepApproved',
  'warehouse.requisitionApproved',
  'warehouse.requisitionRejected',
  'warehouse.inboundApproved',
  'warehouse.inboundRejected',
  'warehouse.returnApproved',
  'warehouse.returnRejected',
  'warehouse.scrapApproved',
  'warehouse.scrapRejected',
  'training.planApproved',
  'training.planRejected',
  'equipment.maintenanceApproved',
  'equipment.maintenanceRejected',
  'capa.verificationApproved',
  'deviation.approvalApproved',
  'deviation.approvalRejected',
  'productRecall.approvalApproved',
  'productRecall.approvalRejected',
  'changeEvent.approvalApproved',
  'changeEvent.approvalRejected',
];

function extractCallbackKeys(source: string): string[] {
  const matches = source.matchAll(/on(?:Approved|Rejected):\s*['"]([^'"]+)['"]/g);
  return [...matches].map((match) => match[1]);
}

describe('Approval callback seed coverage', () => {
  it('keeps every retained seed callback key registered', () => {
    const registry = new ApprovalCallbackRegistry();
    for (const key of retainedCallbackKeys) {
      registry.register(key, async () => undefined);
    }

    const seedKeys = new Set<string>();
    for (const file of seedFiles) {
      if (!fs.existsSync(file)) continue;
      for (const key of extractCallbackKeys(fs.readFileSync(file, 'utf8'))) {
        seedKeys.add(key);
      }
    }

    const deletedPrefixes = ['workflow.', 'changeApproval.', 'internalAudit.', 'managementReview.', 'assetLoan.'];
    const unexpectedDeletedKeys = [...seedKeys].filter((key) =>
      deletedPrefixes.some((prefix) => key.startsWith(prefix)),
    );
    expect(unexpectedDeletedKeys).toEqual([]);

    const missing = [...seedKeys].filter((key) => !registry.has(key));
    expect(missing).toEqual([]);
  });
});
