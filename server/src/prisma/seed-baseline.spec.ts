import { buildBaselineSeedOptions } from './seed-baseline';

describe('buildBaselineSeedOptions', () => {
  it('keeps minimum organization disabled by default', () => {
    expect(buildBaselineSeedOptions({})).toEqual({
      adminPassword: 'ChangeMe123!',
      seedUserPassword: 'ChangeMe123!',
      ensureMinimumOrganization: false,
    });
  });

  it('enables minimum organization only for exact true', () => {
    expect(buildBaselineSeedOptions({ SEED_MINIMUM_ORG: 'true' }).ensureMinimumOrganization).toBe(true);
    expect(buildBaselineSeedOptions({ SEED_MINIMUM_ORG: 'True' }).ensureMinimumOrganization).toBe(false);
    expect(buildBaselineSeedOptions({ SEED_MINIMUM_ORG: '1' }).ensureMinimumOrganization).toBe(false);
    expect(buildBaselineSeedOptions({ SEED_MINIMUM_ORG: 'yes' }).ensureMinimumOrganization).toBe(false);
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
