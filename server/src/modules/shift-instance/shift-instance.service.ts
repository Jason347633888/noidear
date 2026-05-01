import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShiftInstanceDto, CloseShiftInstanceDto } from './dto/create-shift-instance.dto';

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

    return this.prisma.shiftInstance.create({
      data: {
        company_id: '1',
        shift_type_id: shiftType.id,
        shift_type: shiftType.name,
        shift_date: shiftDate,
        opened_by: userId,
        notes: dto.notes,
      },
      include: { shift_type_ref: true },
    });
  }

  async findAll(date?: string) {
    return this.prisma.shiftInstance.findMany({
      where: {
        company_id: '1',
        ...(date ? { shift_date: new Date(date) } : {}),
      },
      include: {
        shift_type_ref: true,
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
