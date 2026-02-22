import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as dayjs from 'dayjs';

type BatchType = 'material' | 'production' | 'finished';

interface BatchNumberComponents {
  prefix: string;
  date: string;
  sequence: string;
}

const MAX_SEQUENCE = 999;
const VALID_BATCH_TYPES: BatchType[] = ['material', 'production', 'finished'];

@Injectable()
export class BatchNumberGeneratorService {
  private sequenceCache: Map<string, number> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async generateBatchNumber(type: BatchType): Promise<string> {
    this.validateBatchType(type);
    const format = await this.getBatchFormat();
    const today = this.getFormattedDate();
    const sequence = await this.getNextSequence(type, today);
    return this.formatBatchNumber(format, today, sequence);
  }

  private async getBatchFormat(): Promise<string> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'batch.number.format' },
    });
    if (!config) throw new Error('Batch number format config not found');
    return config.value;
  }

  private getFormattedDate(): string {
    return dayjs().format('YYYYMMDD');
  }

  private formatBatchNumber(format: string, date: string, sequence: number): string {
    return format
      .replace('{YYYYMMDD}', date)
      .replace('{序号}', sequence.toString().padStart(3, '0'));
  }

  private async getNextSequence(type: BatchType, date: string): Promise<number> {
    const cacheKey = `${type}-${date}`;
    const current = this.sequenceCache.get(cacheKey) || 0;
    const next = current + 1;
    if (next > MAX_SEQUENCE) {
      throw new BadRequestException(`Sequence overflow: max ${MAX_SEQUENCE} per day`);
    }
    this.sequenceCache.set(cacheKey, next);
    return next;
  }

  private validateBatchType(type: BatchType): void {
    if (!VALID_BATCH_TYPES.includes(type)) {
      throw new BadRequestException(`Invalid batch type: ${type}`);
    }
  }

  validateBatchNumber(batchNumber: string): boolean {
    const regex = /^[A-Z]+-\d{8}-\d{3}$/;
    return regex.test(batchNumber);
  }

  parseBatchNumber(batchNumber: string): BatchNumberComponents {
    if (!this.validateBatchNumber(batchNumber)) {
      throw new Error('Invalid batch number format');
    }
    const parts = batchNumber.split('-');
    return { prefix: parts[0], date: parts[1], sequence: parts[2] };
  }

  async resetDailySequence(): Promise<void> {
    const yesterday = dayjs().subtract(1, 'day').format('YYYYMMDD');
    const keysToDelete = Array.from(this.sequenceCache.keys()).filter((key) =>
      key.includes(yesterday),
    );
    keysToDelete.forEach((key) => this.sequenceCache.delete(key));
  }
}
