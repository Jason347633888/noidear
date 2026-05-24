import { Test } from '@nestjs/testing';
import { ShiftInstanceService } from './shift-instance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('ShiftInstanceService', () => {
  let service: ShiftInstanceService;

  const mockPrisma = {
    shiftType: {
      findFirst: jest.fn(),
    },
    teamShiftSchedule: {
      findMany: jest.fn(),
    },
    team: {
      findFirst: jest.fn(),
    },
    shiftInstance: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ShiftInstanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ShiftInstanceService);
    mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([]);
  });

  describe('create', () => {
    const dayShiftType = {
      id: 'shift-day',
      code: 'DAY',
      name: '白班',
      start_time: '08:00',
      end_time: '20:00',
      crosses_day: false,
      active: true,
    };

    const scheduledTeam = {
      id: 'team-a',
      code: 'TEAM-A',
      name: 'A班',
      active: true,
    };

    const schedule = {
      id: 'schedule-1',
      team_id: 'team-a',
      shift_type_id: 'shift-day',
      work_date: new Date('2026-05-02'),
      leader_id: 'employee-leader-1',
      team: scheduledTeam,
    };

    const secondScheduledTeam = {
      id: 'team-b',
      code: 'TEAM-B',
      name: 'B班',
      active: true,
    };

    const secondSchedule = {
      id: 'schedule-2',
      team_id: 'team-b',
      shift_type_id: 'shift-day',
      work_date: new Date('2026-05-02'),
      leader_id: 'employee-leader-2',
      team: secondScheduledTeam,
    };

    it('should throw ConflictException when shift already exists for shiftTypeId and date', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ shiftTypeId: 'shift-day', shift_date: '2026-04-22' }, 'user1'),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.shiftInstance.findUnique).toHaveBeenCalledWith({
        where: {
          company_id_shift_type_id_shift_date: {
            company_id: '1',
            shift_type_id: 'shift-day',
            shift_date: new Date('2026-04-22'),
          },
        },
      });
    });

    it('should create shift from shiftTypeId and persist the legacy name snapshot', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'new-id',
        status: 'open',
        shift_type_id: 'shift-day',
        shift_type: '白班',
      });

      const result = await service.create(
        { shiftTypeId: 'shift-day', shift_date: '2026-04-22' },
        'user1',
      );

      expect(result.status).toBe('open');
      expect(mockPrisma.shiftType.findFirst).toHaveBeenCalledWith({
        where: { id: 'shift-day', active: true },
      });
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: {
          company_id: '1',
          shift_type_id: 'shift-day',
          shift_type: '白班',
          shift_date: new Date('2026-04-22'),
          team_id: undefined,
          // No schedule → no leaderId → falls back to creator userId so user can see own shift.
          leader_id: 'user1',
          team_override_reason: undefined,
          opened_by: 'user1',
          notes: undefined,
        },
        include: { shift_type_ref: true, team: true },
      });
    });

    it('should keep legacy shift_type payload working during migration window', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'new-id',
        status: 'open',
        shift_type_id: 'shift-day',
        shift_type: '白班',
      });

      await service.create({ shift_type: '白班', shift_date: '2026-04-22' }, 'user1');

      expect(mockPrisma.shiftType.findFirst).toHaveBeenCalledWith({
        where: { name: '白班', active: true },
      });
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shift_type_id: 'shift-day',
            shift_type: '白班',
          }),
        }),
      );
    });

    it('should reject unknown legacy shift_type values', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ shift_type: '中班', shift_date: '2026-04-22' }, 'user1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.shiftInstance.create).not.toHaveBeenCalled();
    });

    it('should attach scheduled team and leader when opening a shift', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([schedule]);
      mockPrisma.team.findFirst.mockResolvedValue(scheduledTeam);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'shift-1',
        status: 'open',
        shift_type_id: 'shift-day',
        shift_type: '白班',
        team_id: 'team-a',
        leader_id: 'employee-leader-1',
      });

      await service.create({ shiftTypeId: 'shift-day', shift_date: '2026-05-02' }, 'user1');

      expect(mockPrisma.teamShiftSchedule.findMany).toHaveBeenCalledWith({
        where: {
          shift_type_id: 'shift-day',
          work_date: new Date('2026-05-02'),
        },
        include: { team: true },
        orderBy: { team_id: 'asc' },
      });
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          team_id: 'team-a',
          leader_id: 'employee-leader-1',
          team_override_reason: undefined,
        }),
        include: { shift_type_ref: true, team: true },
      });
    });

    it('should allow opening a shift without a schedule', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([]);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'shift-1',
        status: 'open',
        shift_type_id: 'shift-day',
        shift_type: '白班',
        team_id: null,
        leader_id: 'user1',
      });

      await service.create({ shiftTypeId: 'shift-day', shift_date: '2026-05-02' }, 'user1');

      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          team_id: undefined,
          // When no schedule provides a leaderId, falls back to the creator (userId)
          // so the creator can see their own shift in findAll (which filters by leader_id).
          leader_id: 'user1',
          team_override_reason: undefined,
        }),
        include: { shift_type_ref: true, team: true },
      });
    });

    it('should reject ambiguous schedules when teamId is omitted', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([schedule, secondSchedule]);

      await expect(
        service.create({ shiftTypeId: 'shift-day', shift_date: '2026-05-02' }, 'user1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.shiftInstance.create).not.toHaveBeenCalled();
    });

    it('should allow documented team selection when multiple schedules match', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([schedule, secondSchedule]);
      mockPrisma.team.findFirst.mockResolvedValue(secondScheduledTeam);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'shift-1',
        team_id: 'team-b',
        leader_id: 'employee-leader-2',
        team_override_reason: '同班次存在多个排班，现场指定B班负责开班',
      });

      await service.create(
        {
          shiftTypeId: 'shift-day',
          shift_date: '2026-05-02',
          teamId: 'team-b',
          teamOverrideReason: '同班次存在多个排班，现场指定B班负责开班',
        },
        'user1',
      );

      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          team_id: 'team-b',
          leader_id: 'employee-leader-2',
          team_override_reason: '同班次存在多个排班，现场指定B班负责开班',
        }),
        include: { shift_type_ref: true, team: true },
      });
    });

    it('should require a reason when overriding scheduled team or leader', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([schedule]);
      mockPrisma.team.findFirst.mockResolvedValue({
        id: 'team-b',
        code: 'TEAM-B',
        name: 'B班',
        active: true,
      });

      await expect(
        service.create(
          {
            shiftTypeId: 'shift-day',
            shift_date: '2026-05-02',
            teamId: 'team-b',
          },
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.shiftInstance.create).not.toHaveBeenCalled();
    });

    it('should allow documented team override', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([schedule]);
      mockPrisma.team.findFirst.mockResolvedValue({
        id: 'team-b',
        code: 'TEAM-B',
        name: 'B班',
        active: true,
      });
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'shift-1',
        team_id: 'team-b',
        leader_id: 'employee-leader-2',
        team_override_reason: '临时调班',
      });

      await service.create(
        {
          shiftTypeId: 'shift-day',
          shift_date: '2026-05-02',
          teamId: 'team-b',
          leaderId: 'employee-leader-2',
          teamOverrideReason: '临时调班',
        },
        'user1',
      );

      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          team_id: 'team-b',
          leader_id: 'employee-leader-2',
          team_override_reason: '临时调班',
        }),
        include: { shift_type_ref: true, team: true },
      });
    });
  });

  describe('close', () => {
    it('should throw BadRequestException when already closed', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 'id1', status: 'closed', production_runs: [] });
      await expect(service.close('id1', {}, 'user1')).rejects.toThrow(BadRequestException);
    });

    it('should close an open shift', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({
        id: 'id1', status: 'open', production_runs: [],
      });
      mockPrisma.shiftInstance.update.mockResolvedValue({ id: 'id1', status: 'closed' });
      const result = await service.close('id1', {}, 'user1');
      expect(result.status).toBe('closed');
    });
  });
});
