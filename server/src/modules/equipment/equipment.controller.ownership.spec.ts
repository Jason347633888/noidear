/**
 * P0-R3-3 — EquipmentController listForOwnership wired up
 */
import { EquipmentController } from './equipment.controller';
import { OwnershipContext } from '../module-access/ownership-context';

function freshController() {
  const service: any = {
    listForOwnership: jest.fn().mockResolvedValue([{ id: 'eq-1' }]),
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStatus: jest.fn(),
  };
  const ctrl = new EquipmentController(service);
  return { ctrl, service };
}

describe('EquipmentController — listForOwnership integration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET / calls service.listForOwnership with ownership', async () => {
    const { ctrl, service } = freshController();
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    const result = await ctrl.findAll({} as any, ownership);
    expect(service.listForOwnership).toHaveBeenCalledWith(ownership);
    expect(service.findAll).not.toHaveBeenCalled();
    expect(result).toEqual([{ id: 'eq-1' }]);
  });

  it('does NOT call old findAll', async () => {
    const { ctrl, service } = freshController();
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await ctrl.findAll({} as any, ownership);
    expect(service.findAll).not.toHaveBeenCalled();
  });
});
