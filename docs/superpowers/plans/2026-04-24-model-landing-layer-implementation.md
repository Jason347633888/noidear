# Model Landing Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the frozen model-landing spec into executable, testable server-side metadata so later agents can query the 59 execution groups and 283 form mappings without re-parsing docs by hand.

**Architecture:** Add a small read-only `ModelLandingModule` in the NestJS server. It will load a generated TypeScript artifact produced from `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`, expose summary and lookup APIs, and ship with a verification script that asserts the artifact stays aligned with the frozen spec. This phase does **not** change Prisma schema or implement the traceability query layer; it codifies the frozen mapping as executable infrastructure.

**Tech Stack:** NestJS, TypeScript, Jest, Node.js `fs/path`, checked-in CSV/Markdown artifacts

---

## File Structure

### New files

- `server/src/modules/model-landing/model-landing.types.ts`
  - Shared TypeScript types for per-form rows, group summaries, and metadata.
- `server/src/modules/model-landing/model-landing.parser.ts`
  - Pure parsing and summary helpers for the frozen CSV.
- `server/src/modules/model-landing/model-landing.parser.spec.ts`
  - Unit tests for CSV parsing, quoted-field handling, and summary generation.
- `server/src/modules/model-landing/generated/model-landing.generated.ts`
  - Generated artifact committed to the repo; runtime reads this instead of opening docs files.
- `server/src/modules/model-landing/model-landing.service.ts`
  - Read-only lookup service over the generated artifact.
- `server/src/modules/model-landing/model-landing.controller.ts`
  - HTTP endpoints for summary, group lookup, and form-code lookup.
- `server/src/modules/model-landing/model-landing.module.ts`
  - Nest module wrapper for the controller and service.
- `server/src/modules/model-landing/model-landing.service.spec.ts`
  - Unit tests for service summary, group lookup, and form lookup.
- `server/src/modules/model-landing/model-landing.controller.spec.ts`
  - Controller wiring tests.
- `server/scripts/generate-model-landing-artifacts.ts`
  - Reads the frozen CSV and writes `model-landing.generated.ts`.
- `server/scripts/verify-model-landing-artifacts.ts`
  - Verifies `283` rows, `59` groups, `0` unmapped, and spec markers.

### Modified files

- `server/src/app.module.ts`
  - Import the new `ModelLandingModule`.
- `server/package.json`
  - Add `model-landing:generate` and `model-landing:verify` scripts.
- `docs/AGENT_GUIDE.md`
  - Add one short implementation note telling future agents to trust the generated artifact plus verification command.

### Existing files to read before coding

- `AGENTS.md`
- `docs/AGENT_GUIDE.md`
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
- `docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.md`
- `server/src/app.module.ts`
- `server/src/prisma/schema.prisma`
- `server/src/modules/record-template/record-template.service.ts`
- `server/src/modules/warehouse/traceability.controller.ts`
- `server/scripts/parse-vault-forms.ts`

---

### Task 1: Build The Typed CSV Parser And Artifact Generator

**Files:**
- Create: `server/src/modules/model-landing/model-landing.types.ts`
- Create: `server/src/modules/model-landing/model-landing.parser.ts`
- Create: `server/src/modules/model-landing/model-landing.parser.spec.ts`
- Create: `server/scripts/generate-model-landing-artifacts.ts`
- Create: `server/src/modules/model-landing/generated/model-landing.generated.ts`

- [ ] **Step 1: Write the failing parser test**

```ts
import { buildGroupSummary, parseModelLandingCsv } from './model-landing.parser';

describe('modelLanding parser', () => {
  it('parses quoted CSV rows and builds stable summary counts', () => {
    const csv = [
      '模板组 ID,编号,表单名,路径,部门,entities,chain,basis',
      'FG-quality-environment-cleaning-02,GRSS-ZZ-JL-19,日常清洁记录表（中段）,制造部/日常清洁记录表（中段）.md,制造部,"CleaningRecord,Employee,Location",通用支撑,v3:环境卫生',
      'FG-quality-environment-cleaning-02,GRSS-ZZ-JL-20,日常清洁记录表（出炉间）,制造部/日常清洁记录表（出炉间）.md,制造部,"CleaningRecord,Employee,Location",通用支撑,v3:环境卫生',
      'FG-batch-production-01,GRSS-ZZ-JL-48,生产计划,制造部/生产计划.md,制造部,"Product,ProductionBatch",主数据/基础档案,v3:生产批次',
    ].join('\n');

    const rows = parseModelLandingCsv(csv);
    const summary = buildGroupSummary(rows);

    expect(rows).toHaveLength(3);
    expect(rows[0].entities).toEqual(['CleaningRecord', 'Employee', 'Location']);
    expect(summary.totalForms).toBe(3);
    expect(summary.totalGroups).toBe(2);
    expect(summary.groupCounts['FG-quality-environment-cleaning-02']).toBe(2);
    expect(summary.unmappedCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- model-landing.parser.spec.ts --runInBand
```

Expected: FAIL with `Cannot find module './model-landing.parser'`.

- [ ] **Step 3: Write the minimal types file**

```ts
export interface ModelLandingFormRow {
  templateGroupId: string;
  code: string;
  formName: string;
  path: string;
  department: string;
  entities: string[];
  chain: string;
  basis: string;
}

export interface ModelLandingSummary {
  totalForms: number;
  totalGroups: number;
  unmappedCount: number;
  groupCounts: Record<string, number>;
}
```

- [ ] **Step 4: Write the parser implementation**

```ts
import { ModelLandingFormRow, ModelLandingSummary } from './model-landing.types';

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

export const parseModelLandingCsv = (csv: string): ModelLandingFormRow[] => {
  const lines = csv
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const [, ...dataLines] = lines;

  return dataLines.map((line) => {
    const [templateGroupId, code, formName, path, department, entities, chain, basis] =
      parseCsvLine(line);

    return {
      templateGroupId,
      code,
      formName,
      path,
      department,
      entities: entities ? entities.split(',').map((item) => item.trim()).filter(Boolean) : [],
      chain,
      basis,
    };
  });
};

export const buildGroupSummary = (rows: ModelLandingFormRow[]): ModelLandingSummary => {
  const groupCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.templateGroupId] = (acc[row.templateGroupId] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalForms: rows.length,
    totalGroups: Object.keys(groupCounts).length,
    unmappedCount: rows.filter((row) => row.templateGroupId === 'UNMAPPED').length,
    groupCounts,
  };
};
```

- [ ] **Step 5: Re-run the parser test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- model-landing.parser.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Write the artifact generator script**

```ts
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
```

- [ ] **Step 7: Run the generator and verify the generated file exists**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx ts-node --compiler-options '{"module":"commonjs"}' scripts/generate-model-landing-artifacts.ts
```

Expected: PASS with output containing `Generated model landing artifact: 283 forms / 59 groups`.

- [ ] **Step 8: Commit**

```bash
git add \
  server/src/modules/model-landing/model-landing.types.ts \
  server/src/modules/model-landing/model-landing.parser.ts \
  server/src/modules/model-landing/model-landing.parser.spec.ts \
  server/scripts/generate-model-landing-artifacts.ts \
  server/src/modules/model-landing/generated/model-landing.generated.ts

git commit -m "feat: add model landing artifact generator"
```

### Task 2: Expose The Frozen Registry Through A Nest Module

**Files:**
- Create: `server/src/modules/model-landing/model-landing.service.ts`
- Create: `server/src/modules/model-landing/model-landing.controller.ts`
- Create: `server/src/modules/model-landing/model-landing.module.ts`
- Create: `server/src/modules/model-landing/model-landing.service.spec.ts`
- Create: `server/src/modules/model-landing/model-landing.controller.spec.ts`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: Write the failing service spec**

```ts
jest.mock('./generated/model-landing.generated', () => ({
  MODEL_LANDING_FORMS: [
    {
      templateGroupId: 'FG-master-product-01',
      code: 'GRSS-KF-JL-05',
      formName: '产品规格书',
      path: '产品开发部/产品规格书/产品规格书.md',
      department: '产品开发部',
      entities: ['Product', 'Recipe'],
      chain: '研发/变更',
      basis: 'test:fixture',
    },
  ],
  MODEL_LANDING_GROUPS: [{ id: 'FG-master-product-01', count: 1 }],
  MODEL_LANDING_SUMMARY: {
    totalForms: 1,
    totalGroups: 1,
    unmappedCount: 0,
    groupCounts: { 'FG-master-product-01': 1 },
  },
}));

import { ModelLandingService } from './model-landing.service';

describe('ModelLandingService', () => {
  it('returns summary and lookups from generated data', () => {
    const service = new ModelLandingService();

    expect(service.getSummary()).toEqual({
      totalForms: 1,
      totalGroups: 1,
      unmappedCount: 0,
      groupCounts: { 'FG-master-product-01': 1 },
    });

    expect(service.getFormByCode('GRSS-KF-JL-05')?.formName).toBe('产品规格书');
    expect(service.getGroup('FG-master-product-01')?.count).toBe(1);
  });
});
```

- [ ] **Step 2: Run the service spec to verify it fails**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- model-landing.service.spec.ts --runInBand
```

Expected: FAIL with `Cannot find module './model-landing.service'`.

- [ ] **Step 3: Write the service implementation**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MODEL_LANDING_FORMS,
  MODEL_LANDING_GROUPS,
  MODEL_LANDING_SUMMARY,
} from './generated/model-landing.generated';

@Injectable()
export class ModelLandingService {
  getSummary() {
    return MODEL_LANDING_SUMMARY;
  }

  listGroups() {
    return MODEL_LANDING_GROUPS;
  }

  getGroup(groupId: string) {
    const group = MODEL_LANDING_GROUPS.find((item) => item.id === groupId);
    if (!group) {
      throw new NotFoundException(`Unknown model landing group: ${groupId}`);
    }

    return {
      ...group,
      forms: MODEL_LANDING_FORMS.filter((row) => row.templateGroupId === groupId),
    };
  }

  getFormByCode(code: string) {
    const form = MODEL_LANDING_FORMS.find((row) => row.code === code);
    if (!form) {
      throw new NotFoundException(`Unknown model landing form code: ${code}`);
    }
    return form;
  }
}
```

- [ ] **Step 4: Write the controller and module**

```ts
import { Controller, Get, Param } from '@nestjs/common';
import { ModelLandingService } from './model-landing.service';

@Controller('model-landing')
export class ModelLandingController {
  constructor(private readonly modelLandingService: ModelLandingService) {}

  @Get('summary')
  getSummary() {
    return this.modelLandingService.getSummary();
  }

  @Get('groups')
  listGroups() {
    return this.modelLandingService.listGroups();
  }

  @Get('groups/:groupId')
  getGroup(@Param('groupId') groupId: string) {
    return this.modelLandingService.getGroup(groupId);
  }

  @Get('forms/:code')
  getForm(@Param('code') code: string) {
    return this.modelLandingService.getFormByCode(code);
  }
}
```

```ts
import { Module } from '@nestjs/common';
import { ModelLandingController } from './model-landing.controller';
import { ModelLandingService } from './model-landing.service';

@Module({
  controllers: [ModelLandingController],
  providers: [ModelLandingService],
  exports: [ModelLandingService],
})
export class ModelLandingModule {}
```

- [ ] **Step 5: Write the controller spec**

```ts
import { Test } from '@nestjs/testing';
import { ModelLandingController } from './model-landing.controller';
import { ModelLandingService } from './model-landing.service';

describe('ModelLandingController', () => {
  it('wires summary and lookup endpoints to the service', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ModelLandingController],
      providers: [
        {
          provide: ModelLandingService,
          useValue: {
            getSummary: jest.fn().mockReturnValue({ totalForms: 283, totalGroups: 59, unmappedCount: 0 }),
            listGroups: jest.fn().mockReturnValue([{ id: 'FG-master-product-01', count: 2 }]),
            getGroup: jest.fn().mockReturnValue({ id: 'FG-master-product-01', count: 2, forms: [] }),
            getFormByCode: jest.fn().mockReturnValue({ code: 'GRSS-KF-JL-05', formName: '产品规格书' }),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(ModelLandingController);

    expect(controller.getSummary()).toEqual({ totalForms: 283, totalGroups: 59, unmappedCount: 0 });
    expect(controller.listGroups()).toEqual([{ id: 'FG-master-product-01', count: 2 }]);
    expect(controller.getGroup('FG-master-product-01')).toEqual({ id: 'FG-master-product-01', count: 2, forms: [] });
    expect(controller.getForm('GRSS-KF-JL-05')).toEqual({ code: 'GRSS-KF-JL-05', formName: '产品规格书' });
  });
});
```

- [ ] **Step 6: Wire the module into `AppModule`**

Add this import:

```ts
import { ModelLandingModule } from './modules/model-landing/model-landing.module';
```

Add this entry to the `imports` array near the other metadata/document modules:

```ts
ModelLandingModule,
```

- [ ] **Step 7: Run the new test set**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- model-landing.service.spec.ts model-landing.controller.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add \
  server/src/modules/model-landing/model-landing.service.ts \
  server/src/modules/model-landing/model-landing.controller.ts \
  server/src/modules/model-landing/model-landing.module.ts \
  server/src/modules/model-landing/model-landing.service.spec.ts \
  server/src/modules/model-landing/model-landing.controller.spec.ts \
  server/src/app.module.ts

git commit -m "feat: expose model landing registry module"
```

### Task 3: Add Verification Commands And Freeze-Guard Checks

**Files:**
- Create: `server/scripts/verify-model-landing-artifacts.ts`
- Modify: `server/package.json`

- [ ] **Step 1: Write the failing verification test**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MODEL_LANDING_FORMS,
  MODEL_LANDING_GROUPS,
  MODEL_LANDING_SUMMARY,
} from '../src/modules/model-landing/generated/model-landing.generated';

describe('model landing artifact freeze guard', () => {
  it('matches the frozen spec counts', () => {
    const repoRoot = resolve(__dirname, '..', '..');
    const spec = readFileSync(
      resolve(repoRoot, 'docs/superpowers/specs/2026-04-24-model-landing-layer-design.md'),
      'utf8',
    );

    expect(MODEL_LANDING_FORMS).toHaveLength(283);
    expect(MODEL_LANDING_GROUPS).toHaveLength(59);
    expect(MODEL_LANDING_SUMMARY.unmappedCount).toBe(0);
    expect(spec).toContain('template groups used in second pass: `59`');
    expect(spec).toContain('### Appendix A.3 Frozen Execution-Level Group Table');
    expect(spec).toContain('### Appendix C.7 Frozen Execution-Group Action Inheritance Table');
  });
});
```

Save it to:

`server/test/model-landing-freeze.spec.ts`

- [ ] **Step 2: Run the freeze test to verify it fails before the script exists**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- model-landing-freeze.spec.ts --runInBand
```

Expected: FAIL if imports or generated artifact wiring are incomplete.

- [ ] **Step 3: Write the verification script**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MODEL_LANDING_FORMS,
  MODEL_LANDING_GROUPS,
  MODEL_LANDING_SUMMARY,
} from '../src/modules/model-landing/generated/model-landing.generated';

const repoRoot = resolve(__dirname, '..', '..');
const specPath = resolve(repoRoot, 'docs/superpowers/specs/2026-04-24-model-landing-layer-design.md');
const spec = readFileSync(specPath, 'utf8');

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

assert(MODEL_LANDING_FORMS.length === 283, `Expected 283 forms, got ${MODEL_LANDING_FORMS.length}`);
assert(MODEL_LANDING_GROUPS.length === 59, `Expected 59 groups, got ${MODEL_LANDING_GROUPS.length}`);
assert(MODEL_LANDING_SUMMARY.unmappedCount === 0, `Expected 0 unmapped rows, got ${MODEL_LANDING_SUMMARY.unmappedCount}`);
assert(spec.includes('template groups used in second pass: `59`'), 'Frozen spec is missing second-pass group count marker');
assert(spec.includes('### Appendix A.3 Frozen Execution-Level Group Table'), 'Frozen spec is missing Appendix A.3');
assert(spec.includes('### Appendix C.7 Frozen Execution-Group Action Inheritance Table'), 'Frozen spec is missing Appendix C.7');

console.log('Model landing artifacts verified: 283 forms / 59 groups / 0 unmapped');
```

- [ ] **Step 4: Add npm scripts**

Add these entries to `server/package.json`:

```json
{
  "scripts": {
    "model-landing:generate": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/generate-model-landing-artifacts.ts",
    "model-landing:verify": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/verify-model-landing-artifacts.ts"
  }
}
```

- [ ] **Step 5: Run the freeze test and verification command**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- model-landing-freeze.spec.ts --runInBand
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run model-landing:verify
```

Expected:
- Jest: PASS
- Script: `Model landing artifacts verified: 283 forms / 59 groups / 0 unmapped`

- [ ] **Step 6: Commit**

```bash
git add \
  server/test/model-landing-freeze.spec.ts \
  server/scripts/verify-model-landing-artifacts.ts \
  server/package.json

git commit -m "chore: add model landing verification commands"
```

### Task 4: Document The Runtime Contract For Future Agents

**Files:**
- Modify: `docs/AGENT_GUIDE.md`

- [ ] **Step 1: Write the failing doc check as a grep command**

Run:

```bash
rg -n "model-landing:verify|model-landing/generated|2026-04-24-model-landing-layer-form-expansion.csv" /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md
```

Expected: no output.

- [ ] **Step 2: Add the runtime contract note to `docs/AGENT_GUIDE.md`**

Insert a short section near the food-safety/modeling guidance:

```md
## Model Landing Runtime Contract

When a task depends on the frozen model-landing mapping, treat these as the runtime truth sources:

- `docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
- `server/src/modules/model-landing/generated/model-landing.generated.ts`

Before trusting changes to the generated artifact, run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run model-landing:verify
```

Do not re-classify the 283 forms in implementation work unless the frozen spec is explicitly updated first.
```

- [ ] **Step 3: Verify the doc note exists**

Run:

```bash
rg -n "Model Landing Runtime Contract|model-landing:verify|model-landing/generated" /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md
```

Expected: matching lines are printed.

- [ ] **Step 4: Run the full focused verification set**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- model-landing.parser.spec.ts model-landing.service.spec.ts model-landing.controller.spec.ts model-landing-freeze.spec.ts --runInBand
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run model-landing:verify
```

Expected:
- All four Jest specs PASS
- verification script PASS

- [ ] **Step 5: Commit**

```bash
git add docs/AGENT_GUIDE.md

git commit -m "docs: add model landing runtime contract"
```

---

## Self-Review

- Spec coverage check:
  - The frozen spec and 59-group execution mapping are implemented as generated runtime metadata in Task 1.
  - Queryable server-side access is implemented in Task 2.
  - Freeze guards and verification are implemented in Task 3.
  - Future-agent usage guidance is implemented in Task 4.
- Placeholder scan:
  - No placeholder markers remain.
- Type consistency:
  - `ModelLandingFormRow`, `ModelLandingSummary`, `MODEL_LANDING_FORMS`, `MODEL_LANDING_GROUPS`, and `MODEL_LANDING_SUMMARY` are used consistently across parser, generator, service, and verification tasks.


## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-24-model-landing-layer-implementation.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
