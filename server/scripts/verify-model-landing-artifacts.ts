import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MODEL_LANDING_FORMS,
  MODEL_LANDING_GROUPS,
  MODEL_LANDING_SUMMARY,
} from '../src/modules/model-landing/generated/model-landing.generated';

const repoRoot = resolve(__dirname, '..', '..');
const specPath = resolve(repoRoot, 'archive/superpowers/specs/2026-04-24-model-landing-layer-design.md');
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
