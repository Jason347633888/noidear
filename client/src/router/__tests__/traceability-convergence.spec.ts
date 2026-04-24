import router from '@/router';

describe('traceability convergence routes', () => {
  it('keeps /traceability as the primary query route', async () => {
    const resolved = router.resolve('/traceability');
    expect(resolved.name).toBe('TraceabilityQuery');
  });

  it('marks /batch-trace/query as a legacy redirect route', async () => {
    const resolved = router.resolve('/batch-trace/query');
    // The redirect route name is preserved, not resolved to the destination
    expect(String(resolved.name)).toBe('TraceabilityLegacyRedirect');
    expect(resolved.path).toBe('/batch-trace/query');
  });
});
