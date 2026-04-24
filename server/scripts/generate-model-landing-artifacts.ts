import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildGroupSummary, parseModelLandingCsv } from '../src/modules/model-landing/model-landing.parser';

const repoRoot = resolve(__dirname, '..', '..');
const inputPath = resolve(
  repoRoot,
  'docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv',
);
const outputPath = resolve(
  repoRoot,
  'server/src/modules/model-landing/generated/model-landing.generated.ts',
);

const csv = readFileSync(inputPath, 'utf8');
const rows = parseModelLandingCsv(csv);
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
console.log(`Generated model landing artifact: ${rows.length} forms / ${summary.totalGroups} groups`);
