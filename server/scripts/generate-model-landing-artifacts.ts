import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildGroupSummary, parseModelLandingCsv } from '../src/modules/model-landing/model-landing.parser';
import type { ModelLandingFormRow } from '../src/modules/model-landing/model-landing.types';

const repoRoot = resolve(__dirname, '..', '..');
const candidateInputs = [
  resolve(repoRoot, 'docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv'),
  resolve(repoRoot, 'archive/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv'),
];
const inputPath = candidateInputs.find((path) => existsSync(path));
if (!inputPath) {
  throw new Error(
    `Cannot find model-landing CSV source. Checked:\n  ${candidateInputs.join('\n  ')}`,
  );
}
const outputPath = resolve(
  repoRoot,
  'server/src/modules/model-landing/generated/model-landing.generated.ts',
);

// Entity names that referenced deleted product surfaces. Source forms can keep
// their row (counts must stay frozen) but the entity hint should drop these so
// the generated artifact does not advertise links to removed Prisma models.
const DELETED_ENTITY_NAMES = new Set([
  'AssetLoanRecord',
  'DocumentIssuance',
  'InternalAudit',
  'ManagementReview',
]);
// Renames for entity names that survived under a different model.
const ENTITY_RENAMES: Record<string, string> = {
  ChangeApproval: 'ChangeEvent',
};

const dedupe = (items: string[]): string[] => [...new Set(items)];

const sanitizeEntities = (entities: string[]): string[] =>
  dedupe(
    entities
      .map((name) => ENTITY_RENAMES[name] ?? name)
      .filter((name) => !DELETED_ENTITY_NAMES.has(name)),
  );

const csv = readFileSync(inputPath, 'utf8');
const rows: ModelLandingFormRow[] = parseModelLandingCsv(csv).map((row) => ({
  ...row,
  entities: sanitizeEntities(row.entities),
}));
const summary = buildGroupSummary(rows);
const groupEntries = Object.entries(summary.groupCounts)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([id, count]) => ({ id, count }));

const fileContent = `import { ModelLandingFormRow, ModelLandingSummary } from '../model-landing.types';

export const MODEL_LANDING_FORMS: ModelLandingFormRow[] = ${JSON.stringify(rows, null, 2)};

export const MODEL_LANDING_GROUPS = ${JSON.stringify(groupEntries, null, 2)} as const;

export const MODEL_LANDING_SUMMARY: ModelLandingSummary = ${JSON.stringify(summary, null, 2)};
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, fileContent, 'utf8');
console.log(
  `Generated model landing artifact from ${inputPath}: ${rows.length} forms / ${summary.totalGroups} groups`,
);
