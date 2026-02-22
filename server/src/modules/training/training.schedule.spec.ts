import { Test, TestingModule } from '@nestjs/testing';
import { TrainingScheduleService } from './training.schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ArchiveService } from './archive.service';

describe('TrainingScheduleService', () => {
  let service: TrainingScheduleService;
  let prisma: PrismaService;
  let archiveService: ArchiveService;

  const mockPrisma = {
    trainingProject: {
      findMany: jest.fn(),
    },
  };

  const mockArchiveService = {
    generateArchive: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingScheduleService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ArchiveService,
          useValue: mockArchiveService,
        },
      ],
    }).compile();

    service = module.get<TrainingScheduleService>(TrainingScheduleService);
    prisma = module.get<PrismaService>(PrismaService);
    archiveService = module.get<ArchiveService>(ArchiveService);

    jest.clearAllMocks();
  });

  describe('autoGenerateArchives', () => {
    it('should generate archives for all completed projects without archives', async () => {
      const projects = [
        {
          id: 'project-1',
          title: 'GMP培训',
          status: 'completed',
          archive: null,
          plan: { createdBy: 'user-1' },
        },
        {
          id: 'project-2',
          title: 'SOP培训',
          status: 'completed',
          archive: null,
          plan: { createdBy: 'user-2' },
        },
      ];

      mockPrisma.trainingProject.findMany.mockResolvedValue(projects);
      mockArchiveService.generateArchive.mockResolvedValue({
        archive: { id: 'archive-1' },
      });

      await service.autoGenerateArchives();

      expect(mockPrisma.trainingProject.findMany).toHaveBeenCalledWith({
        where: {
          status: 'completed',
          archive: null,
        },
        include: {
          plan: {
            select: { createdBy: true },
          },
        },
      });

      expect(mockArchiveService.generateArchive).toHaveBeenCalledTimes(2);
      expect(mockArchiveService.generateArchive).toHaveBeenCalledWith(
        'project-1',
        'user-1',
      );
      expect(mockArchiveService.generateArchive).toHaveBeenCalledWith(
        'project-2',
        'user-2',
      );
    });

    it('should handle errors when generating individual archives', async () => {
      const projects = [
        {
          id: 'project-1',
          title: 'GMP培训',
          status: 'completed',
          archive: null,
          plan: { createdBy: 'user-1' },
        },
      ];

      mockPrisma.trainingProject.findMany.mockResolvedValue(projects);
      mockArchiveService.generateArchive.mockRejectedValue(
        new Error('Archive generation error'),
      );

      await service.autoGenerateArchives();

      expect(mockArchiveService.generateArchive).toHaveBeenCalledTimes(1);
    });

    it('should handle empty projects list', async () => {
      mockPrisma.trainingProject.findMany.mockResolvedValue([]);

      await service.autoGenerateArchives();

      expect(mockArchiveService.generateArchive).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching projects', async () => {
      mockPrisma.trainingProject.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await service.autoGenerateArchives();

      expect(mockArchiveService.generateArchive).not.toHaveBeenCalled();
    });
  });
});
