import { JwtStrategy } from './auth.strategy';

describe('JwtStrategy', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('exposes companyId from JWT payload on req.user', async () => {
    const strategy = new JwtStrategy();

    await expect(
      strategy.validate({ sub: 'u1', username: 'admin', role: 'admin', name: '管理员', companyId: '2' }),
    ).resolves.toEqual({
      id: 'u1',
      username: 'admin',
      roleCode: 'admin',
      roleId: '',
      name: '管理员',
      companyId: '2',
      departmentId: undefined,
    });
  });

  it('defaults old JWT payloads to company 1', async () => {
    const strategy = new JwtStrategy();

    await expect(
      strategy.validate({ sub: 'u1', username: 'admin', role: 'admin', name: '管理员' }),
    ).resolves.toEqual(expect.objectContaining({ companyId: '1' }));
  });
});
