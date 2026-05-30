/**
 * EquipmentService.findAll ownership filtering
 * admin → all; user → responsiblePersonId = userId; leader → IN members(managedDepts)
 *
 * EquipmentService.assertOwnership
 * admin → always passes; leader → passes for dept match, fails for other dept;
 * user → passes for own equipment, fails for others
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { OwnershipContext } from '../module-access/ownership-context';
import { CreateEquipmentDto, QueryEquipmentDto } from './dto/equipment.dto';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    equipment: {
      findMany: jest.fn().mockResolvedValue([{ id: 'eq-1' }]),
      count: jest.fn().mockResolvedValue(1),
    },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new EquipmentService(prisma), prisma };
}

const emptyQuery: QueryEquipmentDto = {};

describe('EquipmentService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all equipment (no ownership filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.findAll(emptyQuery, o);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('limit');
    expect(prisma.equipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );
  });

  it('user gets equipment where responsiblePersonId = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(emptyQuery, o);
    expect(prisma.equipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ responsiblePersonId: 'u-1' }) }),
    );
  });

  it('leader gets equipment where responsiblePersonId IN members of managed depts', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll(emptyQuery, o);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { departmentId: { in: ['d-1'] } } }),
    );
    expect(prisma.equipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ responsiblePersonId: { in: ['m-1', 'm-2'] } }) }),
    );
  });

  it('leader with no managed depts returns empty data', async () => {
    const { svc, prisma } = freshService();
    prisma.equipment.findMany.mockResolvedValue([]);
    prisma.equipment.count.mockResolvedValue(0);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: [] };
    const result = await svc.findAll(emptyQuery, o);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('EquipmentService.assertOwnership', () => {
  function freshServiceWithEquipment(
    equipment: { responsiblePersonId: string | null; departmentId?: string | null } | null,
    memberIds: string[] = [],
  ) {
    const prisma: any = {
      equipment: {
        findUnique: jest.fn().mockResolvedValue(equipment),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
    };
    return { svc: new EquipmentService(prisma), prisma };
  }

  beforeEach(() => jest.clearAllMocks());

  it('admin always passes regardless of responsiblePersonId', async () => {
    const { svc } = freshServiceWithEquipment({ responsiblePersonId: 'other-user', departmentId: null });
    const o: OwnershipContext = { userId: 'admin-1', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await expect(svc.assertOwnership('eq-1', o)).resolves.toBeUndefined();
  });

  it('user passes when responsiblePersonId matches userId', async () => {
    const { svc } = freshServiceWithEquipment({ responsiblePersonId: 'u-1', departmentId: null });
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    await expect(svc.assertOwnership('eq-1', o)).resolves.toBeUndefined();
  });

  it('user fails when responsiblePersonId does not match userId', async () => {
    const { svc } = freshServiceWithEquipment({ responsiblePersonId: 'other-user', departmentId: null });
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    await expect(svc.assertOwnership('eq-1', o)).rejects.toThrow(ForbiddenException);
  });

  it('leader passes when responsiblePersonId is a member of managed department', async () => {
    const { svc } = freshServiceWithEquipment({ responsiblePersonId: 'm-1', departmentId: null }, ['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await expect(svc.assertOwnership('eq-1', o)).resolves.toBeUndefined();
  });

  it('leader fails when responsiblePersonId is not in any managed department', async () => {
    const { svc } = freshServiceWithEquipment({ responsiblePersonId: 'other-m', departmentId: null }, ['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await expect(svc.assertOwnership('eq-1', o)).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when equipment does not exist', async () => {
    const { svc } = freshServiceWithEquipment(null);
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    await expect(svc.assertOwnership('nonexistent', o)).rejects.toThrow(NotFoundException);
  });
});

describe('EquipmentService.create writes responsiblePersonId', () => {
  it('create uses creatorId as responsiblePersonId (ignores dto.responsiblePersonId)', async () => {
    const prisma: any = {
      equipment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'eq-new', responsiblePersonId: 'creator-1' }),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new EquipmentService(prisma);
    // dto provides a different user ID — it must be overridden by creatorId
    const dto: CreateEquipmentDto = {
      name: 'Test Eq',
      category: 'production',
      responsiblePersonId: 'other-user',
    };
    await svc.create(dto, 'creator-1');
    expect(prisma.equipment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responsiblePersonId: 'creator-1' }),
      }),
    );
  });

  it('create falls back to dto.responsiblePersonId when creatorId is not provided', async () => {
    const prisma: any = {
      equipment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'eq-new', responsiblePersonId: 'dto-user' }),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new EquipmentService(prisma);
    const dto: CreateEquipmentDto = {
      name: 'Test Eq',
      category: 'production',
      responsiblePersonId: 'dto-user',
    };
    await svc.create(dto);
    expect(prisma.equipment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responsiblePersonId: 'dto-user' }),
      }),
    );
  });
});

describe('EquipmentService.update responsiblePersonId guard', () => {
  function freshUpdateService() {
    const prisma: any = {
      equipment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'eq-1', deletedAt: null, responsiblePersonId: 'u-1' }),
        update: jest.fn().mockResolvedValue({ id: 'eq-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return { svc: new EquipmentService(prisma), prisma };
  }

  beforeEach(() => jest.clearAllMocks());

  it('admin can change responsiblePersonId via update', async () => {
    const { svc, prisma } = freshUpdateService();
    const adminOwnership: OwnershipContext = {
      userId: 'admin-1',
      roleCode: 'admin',
      departmentId: null,
      managedDepartmentIds: undefined,
    };
    const dto = { name: 'EQ Updated', responsiblePersonId: 'new-owner' };
    await svc.update('eq-1', dto, adminOwnership);
    expect(prisma.equipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responsiblePersonId: 'new-owner' }),
      }),
    );
  });

  it('user cannot change responsiblePersonId via update (field silently stripped)', async () => {
    const { svc, prisma } = freshUpdateService();
    const userOwnership: OwnershipContext = {
      userId: 'u-1',
      roleCode: 'user',
      departmentId: 'd-1',
      managedDepartmentIds: [],
    };
    const dto = { name: 'EQ Updated', responsiblePersonId: 'attacker-user' };
    await svc.update('eq-1', dto, userOwnership);
    expect(prisma.equipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ responsiblePersonId: 'attacker-user' }),
      }),
    );
  });

  it('leader cannot change responsiblePersonId via update (field silently stripped)', async () => {
    const { svc, prisma } = freshUpdateService();
    const leaderOwnership: OwnershipContext = {
      userId: 'l-1',
      roleCode: 'leader',
      departmentId: 'd-1',
      managedDepartmentIds: ['d-1'],
    };
    const dto = { name: 'EQ Updated', responsiblePersonId: 'some-other-user' };
    await svc.update('eq-1', dto, leaderOwnership);
    expect(prisma.equipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ responsiblePersonId: 'some-other-user' }),
      }),
    );
  });
});
