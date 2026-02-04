import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OperationLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId: string;
    action: string;
    module: string;
    objectId?: string;
    objectType?: string;
    details?: Record<string, unknown>;
    ip?: string;
  }) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 清理7天前的日志
    await this.prisma.operationLog.deleteMany({
      where: { createdAt: { lt: sevenDaysAgo } },
    });

    return this.prisma.operationLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        module: params.module,
        objectId: params.objectId,
        objectType: params.objectType,
        details: params.details as any,
        ip: params.ip || 'unknown',
      },
    });
  }

  async findAll(page = 1, limit = 20) {
    const [list, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
      }) as unknown as any[],
      this.prisma.operationLog.count(),
    ]);

    return { list, total, page, limit };
  }
}
