import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('returns the authenticated user profile', async () => {
    const user = {
      id: 'user-1',
      username: 'admin',
      roleCode: 'admin',
      roleId: 'role-admin-id',
      name: '管理员',
      companyId: '1',
    };

    await expect(controller.getProfile({ user } as any)).resolves.toBe(user);
  });
});
