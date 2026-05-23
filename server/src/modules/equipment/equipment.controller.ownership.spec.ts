/**
 * EquipmentController findAll wired up with ownership + query
 */
import { EquipmentController } from './equipment.controller';
import { OwnershipContext } from '../module-access/ownership-context';
import { QueryEquipmentDto } from './dto/equipment.dto';

function freshController() {
  const service: any = {
    findAll: jest.fn().mockResolvedValue({ data: [{ id: 'eq-1' }], total: 1, page: 1, limit: 10 }),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStatus: jest.fn(),
  };
  const ctrl = new EquipmentController(service);
  return { ctrl, service };
}

describe('EquipmentController — findAll with ownership + query', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET / calls service.findAll with query and ownership', async () => {
    const { ctrl, service } = freshController();
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    const query: QueryEquipmentDto = { status: 'active', page: 2, limit: 20 };
    const result = await ctrl.findAll(query, ownership);
    expect(service.findAll).toHaveBeenCalledWith(query, ownership);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
  });

  it('passes ownership context to service', async () => {
    const { ctrl, service } = freshController();
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await ctrl.findAll({} as QueryEquipmentDto, ownership);
    expect(service.findAll).toHaveBeenCalledWith(expect.any(Object), ownership);
  });
});
