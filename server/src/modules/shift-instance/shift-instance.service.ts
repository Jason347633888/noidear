import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShiftInstanceDto, CloseShiftInstanceDto } from './dto/create-shift-instance.dto';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

@Injectable()
export class ShiftInstanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShiftType(dto: CreateShiftInstanceDto) {
    const shiftType = dto.shiftTypeId
      ? await this.prisma.shiftType.findFirst({
          where: { id: dto.shiftTypeId, active: true },
        })
      : await this.prisma.shiftType.findFirst({
          where: { name: dto.shift_type, active: true },
        });

    if (!shiftType) {
      throw new BadRequestException('班次类型不存在或已停用');
    }

    return shiftType;
  }

  private async findSchedules(shiftTypeId: string, shiftDate: Date) {
    return this.prisma.teamShiftSchedule.findMany({
      where: {
        shift_type_id: shiftTypeId,
        work_date: shiftDate,
      },
      include: { team: true },
      orderBy: { team_id: 'asc' },
    });
  }

  private async assertTeamActive(teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, active: true },
    });

    if (!team) {
      throw new BadRequestException('班组不存在或已停用');
    }
  }

  private resolveTeamBinding(
    dto: CreateShiftInstanceDto,
    schedules: Array<{ team_id: string; leader_id?: string | null }>,
  ) {
    const hasAmbiguousSchedules = schedules.length > 1;

    if (hasAmbiguousSchedules && !dto.teamId) {
      throw new BadRequestException('同一日期和班次存在多个排班，请指定班组');
    }

    if (hasAmbiguousSchedules && !dto.teamOverrideReason) {
      throw new BadRequestException('同一日期和班次存在多个排班，指定班组时必须填写原因');
    }

    const selectedSchedule = dto.teamId
      ? schedules.find((schedule) => schedule.team_id === dto.teamId) ?? null
      : schedules[0] ?? null;
    const scheduledTeamId = selectedSchedule?.team_id;
    const scheduledLeaderId = selectedSchedule?.leader_id ?? undefined;
    const finalTeamId = dto.teamId ?? scheduledTeamId;
    const finalLeaderId = dto.leaderId ?? scheduledLeaderId;
    const overridesTeam =
      dto.teamId != null && (scheduledTeamId == null || dto.teamId !== scheduledTeamId);
    const overridesLeader = dto.leaderId != null && dto.leaderId !== scheduledLeaderId;

    if ((overridesTeam || overridesLeader) && !dto.teamOverrideReason) {
      throw new BadRequestException('覆盖排班班组或负责人时必须填写原因');
    }

    return {
      teamId: finalTeamId,
      leaderId: finalLeaderId,
      overrideReason:
        hasAmbiguousSchedules || overridesTeam || overridesLeader
          ? dto.teamOverrideReason
          : undefined,
    };
  }

  async create(dto: CreateShiftInstanceDto, userId: string) {
    const shiftType = await this.resolveShiftType(dto);
    const shiftDate = new Date(dto.shift_date);

    const existing = await this.prisma.shiftInstance.findUnique({
      where: {
        company_id_shift_type_id_shift_date: {
          company_id: '1',
          shift_type_id: shiftType.id,
          shift_date: shiftDate,
        },
      },
    });
    if (existing) throw new ConflictException('该班次已开班');

    const schedules = await this.findSchedules(shiftType.id, shiftDate);
    const teamBinding = this.resolveTeamBinding(dto, schedules);

    if (teamBinding.teamId) {
      await this.assertTeamActive(teamBinding.teamId);
    }

    return this.prisma.shiftInstance.create({
      data: {
        company_id: '1',
        shift_type_id: shiftType.id,
        shift_type: shiftType.name,
        shift_date: shiftDate,
        team_id: teamBinding.teamId,
        leader_id: teamBinding.leaderId,
        team_override_reason: teamBinding.overrideReason,
        opened_by: userId,
        notes: dto.notes,
      },
      include: { shift_type_ref: true, team: true },
    });
  }

  async findAll(date?: string, ownership?: OwnershipContext) {
    const where: Record<string, unknown> = {
      company_id: '1',
      ...(date ? { shift_date: new Date(date) } : {}),
    };

    // Ownership scoping — ShiftInstance.leader_id is the user FK
    if (ownership && ownership.roleCode !== 'admin') {
      if (ownership.roleCode === 'user') {
        where['leader_id'] = ownership.userId;
      } else if (ownership.roleCode === 'leader') {
        const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
        if (memberIds.length === 0) return [];
        where['leader_id'] = { in: memberIds };
      }
    }

    return this.prisma.shiftInstance.findMany({
      where,
      include: {
        shift_type_ref: true,
        team: true,
        production_runs: {
          include: { product: true },
          orderBy: { started_at: 'asc' },
        },
      },
      orderBy: { shift_date: 'desc' },
    });
  }

  async findOne(id: string) {
    const inst = await this.prisma.shiftInstance.findFirst({
      where: { id, company_id: '1' },
      include: {
        shift_type_ref: true,
        team: true,
        production_runs: {
          include: { product: true, recipe: true },
          orderBy: { started_at: 'asc' },
        },
      },
    });
    if (!inst) throw new NotFoundException('班次不存在');
    return inst;
  }

  async close(id: string, dto: CloseShiftInstanceDto, userId: string) {
    const inst = await this.prisma.shiftInstance.findFirst({
      where: { id, company_id: '1' },
      include: { production_runs: true },
    });
    if (!inst) throw new NotFoundException('班次不存在');
    if (inst.status === 'closed') throw new BadRequestException('班次已关闭');

    return this.prisma.shiftInstance.update({
      where: { id },
      data: {
        status: 'closed',
        closed_by: userId,
        closed_at: new Date(),
        ...(dto.notes != null ? { notes: dto.notes } : {}),
      },
    });
  }
}
