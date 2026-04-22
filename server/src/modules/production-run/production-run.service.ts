import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateProductionRunDto, CloseProductionRunDto } from './dto/create-production-run.dto';

@Injectable()
export class ProductionRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateProductionRunDto) {
    const shift = await this.prisma.shiftInstance.findFirst({
      where: { id: dto.shift_instance_id, company_id: '1' },
    });
    if (!shift) throw new NotFoundException('班次不存在');
    if (shift.status === 'closed') throw new BadRequestException('班次已关闭，不能开产');

    return this.prisma.productionRun.create({
      data: {
        company_id: '1',
        shift_instance_id: dto.shift_instance_id,
        production_line: dto.production_line,
        product_id: dto.product_id,
        recipe_id: dto.recipe_id,
        started_at: dto.started_at ? new Date(dto.started_at) : new Date(),
        notes: dto.notes,
      },
      include: { product: true, recipe: true, shift_instance: true },
    });
  }

  async findByShift(shiftInstanceId: string) {
    return this.prisma.productionRun.findMany({
      where: { shift_instance_id: shiftInstanceId, company_id: '1' },
      include: { product: true, recipe: true },
      orderBy: { started_at: 'asc' },
    });
  }

  async close(id: string, dto: CloseProductionRunDto) {
    const run = await this.prisma.productionRun.findFirst({
      where: { id, company_id: '1' },
    });
    if (!run) throw new NotFoundException('生产段不存在');
    if (run.status === 'closed') throw new BadRequestException('生产段已关闭');

    const closed = await this.prisma.productionRun.update({
      where: { id },
      data: {
        status: 'closed',
        ended_at: new Date(),
        ...(dto.actual_yield != null ? { actual_yield: dto.actual_yield } : {}),
        ...(dto.yield_unit != null ? { yield_unit: dto.yield_unit } : {}),
        ...(dto.notes != null ? { notes: dto.notes } : {}),
      },
    });

    this.eventEmitter.emit('production-run.closed', {
      id: closed.id,
      product_id: closed.product_id,
      shift_instance_id: closed.shift_instance_id,
      company_id: closed.company_id,
    });

    return closed;
  }
}
