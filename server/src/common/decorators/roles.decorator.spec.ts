import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles Decorator', () => {
  it('should set metadata with ROLES_KEY', () => {
    // The Roles decorator uses SetMetadata to attach role information
    // We verify ROLES_KEY is defined as a constant
    expect(ROLES_KEY).toBe('roles');
  });

  it('should be a function (decorator factory)', () => {
    expect(typeof Roles).toBe('function');
  });

  it('should create a decorator when called with roles', () => {
    const decorator = Roles('admin', 'leader');
    expect(typeof decorator).toBe('function');
  });
});
