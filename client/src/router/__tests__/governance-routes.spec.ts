import { describe, it, expect } from 'vitest';
import router from '@/router';

describe('governance center routes', () => {
  it('resolves /documents/reviews to DocumentReviews', () => {
    const resolved = router.resolve('/documents/reviews');
    expect(resolved.name).toBe('DocumentReviews');
  });

  it('resolves /training/projects to TrainingProjects', () => {
    const resolved = router.resolve('/training/projects');
    expect(resolved.name).toBe('TrainingProjects');
  });

  it('resolves /visitors to VisitorList', () => {
    const resolved = router.resolve('/visitors');
    expect(resolved.name).toBe('VisitorList');
  });

  it('resolves /access-declarations to AccessDeclarationList', () => {
    const resolved = router.resolve('/access-declarations');
    expect(resolved.name).toBe('AccessDeclarationList');
  });

  it('resolves /external-parties/evaluations to ExternalPartyEvaluations', () => {
    const resolved = router.resolve('/external-parties/evaluations');
    expect(resolved.name).toBe('ExternalPartyEvaluations');
  });

  it('resolves /laundry/records to LaundryRecordList', () => {
    const resolved = router.resolve('/laundry/records');
    expect(resolved.name).toBe('LaundryRecordList');
  });
});
