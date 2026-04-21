import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecordTaskInstanceService {
  private readonly logger = new Logger(RecordTaskInstanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询员工本部门的待填实例（分页）
   */
  async findPending(userId: string, page = 1, limit = 20) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (!user?.departmentId) {
      return { list: [], total: 0, page, limit };
    }

    const where = {
      status: 'pending',
      assignment: { departmentId: user.departmentId, status: 'active' },
    };

    const [list, total] = await Promise.all([
      this.prisma.recordTaskInstance.findMany({
        where,
        include: {
          assignment: { include: { template: true, department: true } },
        },
        orderBy: { deadline: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.recordTaskInstance.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  async findOne(id: string) {
    const instance = await this.prisma.recordTaskInstance.findUnique({
      where: { id },
      include: {
        assignment: { include: { template: true, department: true } },
        records: true,
      },
    });
    if (!instance) {
      throw new NotFoundException('任务实例不存在');
    }
    return instance;
  }

  async markSubmitted(instanceId: string) {
    await this.findOne(instanceId);
    return this.prisma.recordTaskInstance.update({
      where: { id: instanceId },
      data: { status: 'submitted' },
    });
  }

  /**
   * 把超过 deadline 的 pending 实例置为 overdue（由 cron 调用）
   */
  async markOverdue() {
    const now = new Date();
    const result = await this.prisma.recordTaskInstance.updateMany({
      where: { status: 'pending', deadline: { lt: now } },
      data: { status: 'overdue' },
    });
    this.logger.log(`已标记 ${result.count} 条逾期实例`);
    return result;
  }
}
