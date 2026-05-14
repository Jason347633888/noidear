import { Test, TestingModule } from '@nestjs/testing';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { TrainingStatisticsExportService } from './training-statistics-export.service';

describe('TrainingController status endpoints', () => {
  let controller: TrainingController;
  const trainingService = {
    updateProjectStatus: jest.fn(),
  };
  const statisticsExportService = {
    exportProjects: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingController],
      providers: [
        { provide: TrainingService, useValue: trainingService },
        { provide: TrainingStatisticsExportService, useValue: statisticsExportService },
      ],
    }).compile();

    controller = module.get<TrainingController>(TrainingController);
  });

  it('starts a project by setting status to ongoing', async () => {
    trainingService.updateProjectStatus.mockResolvedValue({ id: 'project-1', status: 'ongoing' });
    await expect(controller.startProject('project-1')).resolves.toEqual({ id: 'project-1', status: 'ongoing' });
    expect(trainingService.updateProjectStatus).toHaveBeenCalledWith('project-1', 'ongoing');
  });

  it('completes a project by setting status to completed', async () => {
    trainingService.updateProjectStatus.mockResolvedValue({ id: 'project-1', status: 'completed' });
    await expect(controller.completeProject('project-1')).resolves.toEqual({ id: 'project-1', status: 'completed' });
    expect(trainingService.updateProjectStatus).toHaveBeenCalledWith('project-1', 'completed');
  });

  it('cancels a project by setting status to cancelled', async () => {
    trainingService.updateProjectStatus.mockResolvedValue({ id: 'project-1', status: 'cancelled' });
    await expect(controller.cancelProject('project-1')).resolves.toEqual({ id: 'project-1', status: 'cancelled' });
    expect(trainingService.updateProjectStatus).toHaveBeenCalledWith('project-1', 'cancelled');
  });
});
