import { describe, it, expect } from 'vitest';
import router from '@/router';

describe('trace recall evidence routes', () => {
  it('resolves /traceability/query to TraceabilityQueryPage', () => {
    const resolved = router.resolve('/traceability/query');
    expect(resolved.name).toBe('TraceabilityQueryPage');
  });

  it('resolves /traceability/drills to TraceabilityDrillList', () => {
    const resolved = router.resolve('/traceability/drills');
    expect(resolved.name).toBe('TraceabilityDrillList');
  });

  it('resolves /traceability/drills/:id to TraceabilityDrillDetail', () => {
    const resolved = router.resolve('/traceability/drills/drill-1');
    expect(resolved.name).toBe('TraceabilityDrillDetail');
  });

  it('resolves /recalls to RecallList', () => {
    const resolved = router.resolve('/recalls');
    expect(resolved.name).toBe('RecallList');
  });

  it('resolves /recalls/:id to RecallDetail', () => {
    const resolved = router.resolve('/recalls/recall-1');
    expect(resolved.name).toBe('RecallDetail');
  });

  it('resolves /evidence/exports to EvidenceExportCenter', () => {
    const resolved = router.resolve('/evidence/exports');
    expect(resolved.name).toBe('EvidenceExportCenter');
  });
});
