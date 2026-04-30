import { Test } from '@nestjs/testing';
import { TeamShiftService } from './team-shift.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('TeamShiftService', () => {
  let service: TeamShiftService;

  const mockPrisma = {
    team: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    shiftType: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    teamShiftSchedule: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        TeamShiftService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TeamShiftService);
  });

  describe('createShiftType', () => {
    it('creates a shift type that crosses midnight', async () => {
      const dto = {
        code: 'NIGHT',
        name: '夜班',
        startTime: '20:00',
        endTime: '06:00',
        crossesDay: true,
      };

      mockPrisma.shiftType.create.mockResolvedValue({ id: 'st-1', ...dto });

      await service.createShiftType(dto);

      expect(mockPrisma.shiftType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          crosses_day: true,
          start_time: '20:00',
        }),
      });
    });
  });

  describe('createSchedule', () => {
    it('prevents duplicate schedule for same team/shift/date', async () => {
      mockPrisma.teamShiftSchedule.findUnique.mockResolvedValue({
        id: 'existing',
        team_id: 'team-1',
        shift_type_id: 'shift-1',
        work_date: new Date('2024-01-15'),
      });

      await expect(
        service.createSchedule({
          teamId: 'team-1',
          shiftTypeId: 'shift-1',
          workDate: '2024-01-15',
        }),
      ).rejects.toThrow(new BadRequestException('该班组当天班次已排班'));
    });

    it('creates schedule when no duplicate exists', async () => {
      mockPrisma.teamShiftSchedule.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.create.mockResolvedValue({
        id: 'new-schedule',
        team_id: 'team-1',
        shift_type_id: 'shift-1',
        work_date: new Date('2024-01-15'),
      });

      await service.createSchedule({
        teamId: 'team-1',
        shiftTypeId: 'shift-1',
        workDate: '2024-01-15',
      });

      expect(mockPrisma.teamShiftSchedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          team_id: 'team-1',
          shift_type_id: 'shift-1',
        }),
      });
    });
  });
});
