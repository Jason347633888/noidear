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
