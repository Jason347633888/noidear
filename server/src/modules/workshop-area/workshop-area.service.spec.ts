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
});
