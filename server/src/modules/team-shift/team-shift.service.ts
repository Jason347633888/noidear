import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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

  createTeam(dto: CreateTeamDto) {
    return this.prisma.team.create({
      data: {
        code: dto.code,
        name: dto.name,
      },
    });
  }

  listShiftTypes() {
    return this.prisma.shiftType.findMany({
      where: { active: true },
      orderBy: { created_at: 'asc' },
    });
  }

  createShiftType(dto: CreateShiftTypeDto) {
    return this.prisma.shiftType.create({
      data: {
        code: dto.code,
        name: dto.name,
        start_time: dto.startTime,
        end_time: dto.endTime,
        crosses_day: dto.crossesDay,
      },
    });
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
      },
    });
  }
}
