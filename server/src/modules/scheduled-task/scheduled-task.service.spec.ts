import { Test } from '@nestjs/testing';
import { ScheduledTaskService } from './scheduled-task.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ScheduledTaskService', () => {
  let service: ScheduledTaskService;

  const mockPrisma = {
    recordTaskAssignment: { findMany: jest.fn(), update: jest.fn() },
    recordTaskInstance: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ScheduledTaskService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ScheduledTaskService);
  });

  it('should create instance for a due cron rule', async () => {
    // cron "* * * * *" = every minute, always due
    mockPrisma.recordTaskAssignment.findMany.mockResolvedValue([{
      id: 'a1', isPeriodic: true, cron_expression: '* * * * *',
      title: 'Daily Check', templateId: 't1', departmentId: 'd1',
    }]);
    mockPrisma.recordTaskInstance.create.mockResolvedValue({ id: 'i1' });
    mockPrisma.recordTaskAssignment.update.mockResolvedValue({});

    await service.triggerDueTasks();

    expect(mockPrisma.recordTaskInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ assignmentId: 'a1' }) }),
    );
  });

  it('should skip assignments without cron_expression', async () => {
    mockPrisma.recordTaskAssignment.findMany.mockResolvedValue([{
      id: 'a2', isPeriodic: false, cron_expression: null, title: 'Manual',
    }]);

    await service.triggerDueTasks();

    expect(mockPrisma.recordTaskInstance.create).not.toHaveBeenCalled();
  });
});
