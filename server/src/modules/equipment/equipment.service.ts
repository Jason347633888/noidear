import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateEquipmentDto,
  UpdateEquipmentDto,
  UpdateEquipmentStatusDto,
  QueryEquipmentDto,
} from './dto/equipment.dto';

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateEquipmentDto) {
    try {
      const code = await this.generateCode();
      const extra = this.mapDtoToData(dto);
      const equipment = await this.prisma.equipment.create({
        data: {
          code,
          name: dto.name,
          category: dto.category,
          ...extra,
        },
      });
      this.logger.log(`Equipment created: ${code}`);
      return equipment;
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Equipment code already exists');
      }
      throw error;
    }
  }

  async findAll(query: QueryEquipmentDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(query);

    const [data, total] = await Promise.all([
      this.prisma.equipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        maintenancePlans: {
          where: { deletedAt: null },
          orderBy: { plannedDate: 'desc' },
          take: 10,
        },
        maintenanceRecords: {
          where: { deletedAt: null },
          orderBy: { maintenanceDate: 'desc' },
          take: 10,
        },
        equipmentFaults: {
          where: { deletedAt: null },
          orderBy: { reportTime: 'desc' },
          take: 10,
        },
      },
    });

    if (!equipment || equipment.deletedAt) {
      throw new NotFoundException('Equipment not found');
    }

    return equipment;
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    await this.findOne(id);
    const data = this.mapDtoToData(dto);
    return this.prisma.equipment.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.equipment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateStatus(id: string, dto: UpdateEquipmentStatusDto) {
    const equipment = await this.findOne(id);

    if (dto.status === 'scrapped') {
      return this.handleScrapEquipment(id, equipment);
    }

    const activationDate = dto.status === 'active' && !equipment.activationDate
      ? new Date()
      : undefined;

    return this.prisma.equipment.update({
      where: { id },
      data: { status: dto.status, activationDate },
    });
  }

  // --- Private helpers ---

  private async handleScrapEquipment(id: string, equipment: any) {
    return this.prisma.$transaction(async (tx) => {
      await tx.maintenancePlan.updateMany({
        where: {
          equipmentId: id,
          status: { in: ['pending', 'in_progress'] },
          deletedAt: null,
        },
        data: { status: 'cancelled' },
      });

      this.logger.log(`Cancelled pending plans for scrapped equipment: ${equipment.code}`);

      return tx.equipment.update({
        where: { id },
        data: { status: 'scrapped' },
      });
    });
  }

  private async generateCode(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `EQ-${dateStr}-`;

    const lastEquipment = await this.prisma.equipment.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
    });

    const lastSeq = lastEquipment
      ? parseInt(lastEquipment.code.split('-').pop() ?? '0', 10) || 0
      : 0;

    return `${prefix}${String(lastSeq + 1).padStart(3, '0')}`;
  }

  private mapDtoToData(dto: CreateEquipmentDto | UpdateEquipmentDto): Record<string, any> {
    const dateFields = ['purchaseDate', 'activationDate', 'warrantyExpiry'] as const;
    const directFields = [
      'name', 'model', 'category', 'location',
      'manufacturer', 'responsiblePerson', 'maintenanceConfig', 'description',
    ] as const;

    const data: Record<string, any> = {};

    for (const field of directFields) {
      if ((dto as any)[field] !== undefined) {
        data[field] = (dto as any)[field];
      }
    }

    for (const field of dateFields) {
      if ((dto as any)[field] !== undefined) {
        data[field] = new Date((dto as any)[field]);
      }
    }

    return data;
  }

  private buildWhereClause(query: QueryEquipmentDto) {
    const where: any = { deletedAt: null };
    const { search, category, status, responsiblePerson, location } = query;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { model: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;
    if (responsiblePerson) where.responsiblePerson = responsiblePerson;
    if (location) where.location = { contains: location };

    return where;
  }
}
