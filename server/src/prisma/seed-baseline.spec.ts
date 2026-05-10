import { buildBaselineSeedOptions } from './seed-baseline';

describe('buildBaselineSeedOptions', () => {
  it('returns only A-class baseline options without minimum organization', () => {
    const options = buildBaselineSeedOptions({});
    expect(options).toEqual({
      adminPassword: 'ChangeMe123!',
      seedUserPassword: 'ChangeMe123!',
    });
    expect(options).not.toHaveProperty('ensureMinimumOrganization');
  });

  it('does not produce ensureMinimumOrganization even when SEED_MINIMUM_ORG env is set', () => {
    const options = buildBaselineSeedOptions({ SEED_MINIMUM_ORG: 'true' } as Record<string, string>);
    expect(options).not.toHaveProperty('ensureMinimumOrganization');
  });

  it('uses admin password as the seed user password fallback', () => {
    expect(buildBaselineSeedOptions({ DEFAULT_ADMIN_PASSWORD: 'admin-pass' })).toMatchObject({
      adminPassword: 'admin-pass',
      seedUserPassword: 'admin-pass',
    });
  });

  it('lets DEFAULT_SEED_PASSWORD override the seed user password only', () => {
    expect(
      buildBaselineSeedOptions({
        DEFAULT_ADMIN_PASSWORD: 'admin-pass',
        DEFAULT_SEED_PASSWORD: 'seed-pass',
      }),
    ).toMatchObject({
      adminPassword: 'admin-pass',
      seedUserPassword: 'seed-pass',
    });
  });
});
