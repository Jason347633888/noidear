import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDisposalDto } from './dto/create-disposal.dto';
import { CreateWasteRecordDto } from './dto/create-waste-record.dto';

@Injectable()
export class WasteService {
  constructor(private readonly prisma: PrismaService) {}

  async createDisposal(dto: CreateDisposalDto, _userId: string) {
    return this.prisma.wasteDisposalRecord.create({
      data: {
        company_id: '1',
        material_name: dto.material_name,
        lot_no: dto.lot_no,
        disposal_reason: dto.disposal_reason,
        qty: dto.qty,
        unit: dto.unit,
        disposal_method: dto.disposal_method,
        disposal_date: new Date(dto.disposal_date),
        operator_id: dto.operator_id,
        witness_id: dto.witness_id,
        notes: dto.notes,
      },
    });
  }

  async findAllDisposals() {
    return this.prisma.wasteDisposalRecord.findMany({
      orderBy: { disposal_date: 'desc' },
    });
  }

  async createWasteRecord(dto: CreateWasteRecordDto, _userId: string) {
    return this.prisma.wasteRecord.create({
      data: {
        company_id: '1',
        waste_type: dto.waste_type,
        qty: dto.qty,
        unit: dto.unit,
        recorded_at: new Date(dto.recorded_at),
        production_batch_id: dto.production_batch_id,
        shift: dto.shift,
        disposal_destination: dto.disposal_destination,
        operator_id: dto.operator_id,
      },
    });
  }

  async findAllWasteRecords(wasteType?: string) {
    return this.prisma.wasteRecord.findMany({
      where: wasteType ? { waste_type: wasteType } : {},
      orderBy: { recorded_at: 'desc' },
    });
  }
}
