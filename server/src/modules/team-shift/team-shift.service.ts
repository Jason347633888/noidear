import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateTeamDto, CreateShiftTypeDto, CreateTeamScheduleDto } from './dto/team-shift.dto';

@Injectable()
export class TeamShiftService {
  constructor(private readonly prisma: PrismaService) {}

  listTeams() {
    return this.prisma.team.findMany({
      where: { active: true },
      orderBy: { created_at: 'asc' },
    });
  }

  async createTeam(dto: CreateTeamDto) {
    try {
      return await this.prisma.team.create({
        data: {
          code: dto.code,
          name: dto.name,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('班组代码已存在');
      }
      throw error;
    }
  }

  listShiftTypes() {
    return this.prisma.shiftType.findMany({
      where: { active: true },
      orderBy: { created_at: 'asc' },
    });
  }

  async createShiftType(dto: CreateShiftTypeDto) {
    try {
      return await this.prisma.shiftType.create({
        data: {
          code: dto.code,
          name: dto.name,
          start_time: dto.startTime,
          end_time: dto.endTime,
          crosses_day: dto.crossesDay,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('班次类型代码已存在');
      }
      throw error;
    }
  }

  async createSchedule(dto: CreateTeamScheduleDto) {
    const existing = await this.prisma.teamShiftSchedule.findUnique({
      where: {
        team_id_shift_type_id_work_date: {
          team_id: dto.teamId,
          shift_type_id: dto.shiftTypeId,
          work_date: new Date(dto.workDate),
        },
      },
    });

    if (existing) {
      throw new BadRequestException('该班组当天班次已排班');
    }

    return this.prisma.teamShiftSchedule.create({
      data: {
        team_id: dto.teamId,
        shift_type_id: dto.shiftTypeId,
        work_date: new Date(dto.workDate),
        leader_id: dto.leaderId,
      },
    });
  }
}
