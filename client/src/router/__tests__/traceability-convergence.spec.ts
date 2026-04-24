import router from '@/router';

describe('traceability convergence routes', () => {
  it('keeps /traceability as the primary query route', async () => {
    const resolved = router.resolve('/traceability');
    expect(resolved.name).toBe('TraceabilityQuery');
  });

  it('keeps /batch-trace/query out of primary navigation', async () => {
    const resolved = router.resolve('/batch-trace/query');
    expect(['TraceQuery', 'TraceabilityLegacyRedirect']).toContain(String(resolved.name));
  });
});
