import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { TrainingStatisticsExportService } from './training-statistics-export.service';
import { OwnershipContext } from '../module-access/ownership-context';

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

describe('TrainingController.createProject — calls createProjectForOwnership (H2 fix)', () => {
  let controller: TrainingController;
  const trainingService = {
    createProjectForOwnership: jest.fn(),
  };
  const statisticsExportService = {};

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

  it('createProject delegates to createProjectForOwnership with ownership context', async () => {
    const dto = { planId: 'plan-1', title: 'T', department: 'D', quarter: 1, trainerId: 'admin-1', trainees: [] };
    const req = { user: { id: 'admin-1' } };
    const ownership: OwnershipContext = {
      userId: 'admin-1',
      roleCode: 'admin',
      departmentId: null,
      managedDepartmentIds: undefined,
    };
    trainingService.createProjectForOwnership.mockResolvedValue({ id: 'proj-1' });
    await controller.createProject(dto as any, req, ownership);
    expect(trainingService.createProjectForOwnership).toHaveBeenCalledWith(dto, ownership);
  });

  it('createProject by user role propagates ForbiddenException from service', async () => {
    const dto = { planId: 'plan-1', title: 'T', department: 'D', quarter: 1, trainerId: 'u-1', trainees: [] };
    const req = { user: { id: 'u-1' } };
    const ownership: OwnershipContext = {
      userId: 'u-1',
      roleCode: 'user',
      departmentId: 'd',
      managedDepartmentIds: [],
    };
    trainingService.createProjectForOwnership.mockRejectedValue(
      new ForbiddenException('仅管理员和负责人可管理培训项目'),
    );
    await expect(controller.createProject(dto as any, req, ownership)).rejects.toThrow(ForbiddenException);
  });
});
