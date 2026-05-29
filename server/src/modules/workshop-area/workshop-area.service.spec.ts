import { WorkshopAreaService } from './workshop-area.service';

describe('WorkshopAreaService', () => {
  it('只返回 active 且未删除的配料区域', async () => {
    const prisma: any = {
      workshopArea: {
        findMany: jest.fn().mockResolvedValue([{ id: 'area-1', name: '筛粉间' }]),
      },
    };
    const service = new WorkshopAreaService(prisma);

    await expect(service.findActive()).resolves.toEqual([{ id: 'area-1', name: '筛粉间' }]);
    expect(prisma.workshopArea.findMany).toHaveBeenCalledWith({
      where: { company_id: '1', status: 'active', deleted_at: null },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  });

  it('creates an area point without introducing a separate AreaPoint model', async () => {
    const prisma = {
      workshopArea: {
        create: jest.fn().mockResolvedValue({ id: 'area-1', company_id: 'tenant-1', code: 'FRIDGE-01', name: '一号冰柜', type: 'temperature_point', parentId: 'room-1' }),
      },
    };
    const service = new WorkshopAreaService(prisma as any);
    const result = await service.create({ company_id: 'tenant-1', code: 'FRIDGE-01', name: '一号冰柜', type: 'temperature_point', parentId: 'room-1' } as any);
    expect(prisma.workshopArea.create).toHaveBeenCalledWith({
      data: { company_id: 'tenant-1', code: 'FRIDGE-01', name: '一号冰柜', type: 'temperature_point', parentId: 'room-1' },
    });
    expect(result.type).toBe('temperature_point');
  });

  it('creates an area point with parentId undefined when omitted', async () => {
    const prisma = {
      workshopArea: {
        create: jest.fn().mockResolvedValue({ id: 'area-2', company_id: 'tenant-1', code: 'ROOM-01', name: '配料间', type: 'room', parentId: null }),
      },
    };
    const service = new WorkshopAreaService(prisma as any);
    await service.create({ company_id: 'tenant-1', code: 'ROOM-01', name: '配料间', type: 'room' } as any);
    expect(prisma.workshopArea.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ company_id: 'tenant-1', code: 'ROOM-01', name: '配料间', type: 'room' }),
    });
    const callArg = prisma.workshopArea.create.mock.calls[0][0];
    expect(callArg.data.parentId).toBeUndefined();
  });
});
