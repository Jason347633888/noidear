/**
 * EquipmentService.findAll ownership filtering
 * admin → all; user → responsiblePersonId = userId; leader → IN members(managedDepts)
 */
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

describe('EquipmentService.create writes responsiblePersonId', () => {
  it('create includes responsiblePersonId from dto so user can see equipment in findAll', async () => {
    const prisma: any = {
      equipment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'eq-new', responsiblePersonId: 'u-1' }),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new EquipmentService(prisma);
    const dto: CreateEquipmentDto = {
      name: 'Test Eq',
      category: 'machine',
      responsiblePersonId: 'u-1',
    };
    await svc.create(dto);
    expect(prisma.equipment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responsiblePersonId: 'u-1' }),
      }),
    );
  });
});
