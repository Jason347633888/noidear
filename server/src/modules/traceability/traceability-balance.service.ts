import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryMaterialBalanceDto } from './dto/query-material-balance.dto';

@Injectable()
export class TraceabilityBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(_dto: QueryMaterialBalanceDto, _currentUser: any) {
    return { summary: { status: 'normal' }, rows: [], recommendations: [] };
  }
}
