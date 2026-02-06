import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { convertBigIntToNumber } from '../../common/utils';

type RecycleBinType = 'document' | 'template' | 'task';

@Injectable()
export class RecycleBinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLog: OperationLogService,
  ) {}

  async findAll(
    type: RecycleBinType,
    page: number,
    limit: number,
    keyword?: string,
    userId?: string,
    role?: string,
  ) {
    // 仅管理员可访问回收站
    if (role !== 'admin') {
      throw new BusinessException(ErrorCode.FORBIDDEN, '仅管理员可访问回收站');
    }

    if (type !== 'document' && type !== 'template' && type !== 'task') {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, '无效的类型');
    }

    const skip = (page - 1) * limit;
    const where: any = { deletedAt: { not: null } };

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { number: { contains: keyword } },
      ];
    }

    let list: any[];
    let total: number;

    if (type === 'document') {
      [list, total] = await Promise.all([
        this.prisma.document.findMany({
          where,
          skip,
          take: limit,
          orderBy: { deletedAt: 'desc' },
        }),
        this.prisma.document.count({ where }),
      ]);
    } else if (type === 'template') {
      [list, total] = await Promise.all([
        this.prisma.template.findMany({
          where,
          skip,
          take: limit,
          orderBy: { deletedAt: 'desc' },
        }),
        this.prisma.template.count({ where }),
      ]);
    } else {
      [list, total] = await Promise.all([
        this.prisma.task.findMany({
          where,
          skip,
          take: limit,
          orderBy: { deletedAt: 'desc' },
        }),
        this.prisma.task.count({ where }),
      ]);
    }

    return {
      list: convertBigIntToNumber(list),
      total,
      page,
      limit,
    };
  }

  async restore(type: RecycleBinType, id: string, userId: string, role: string) {
    // 仅管理员可恢复
    if (role !== 'admin') {
      throw new BusinessException(ErrorCode.FORBIDDEN, '仅管理员可恢复项目');
    }

    if (type === 'document') {
      await this.prisma.document.update({
        where: { id },
        data: { deletedAt: null },
      });
    } else if (type === 'template') {
      await this.prisma.template.update({
        where: { id },
        data: { deletedAt: null },
      });
    } else {
      await this.prisma.task.update({
        where: { id },
        data: { deletedAt: null },
      });
    }

    await this.operationLog.log({
      userId,
      action: 'restore',
      module: 'recycle-bin',
      objectId: id,
      objectType: type,
      details: { type, id },
    });
  }

  async permanentDelete(type: RecycleBinType, id: string, userId: string, role: string) {
    // 仅管理员可永久删除
    if (role !== 'admin') {
      throw new BusinessException(ErrorCode.FORBIDDEN, '仅管理员可永久删除项目');
    }

    if (type === 'document') {
      await this.prisma.document.delete({
        where: { id },
      });
    } else if (type === 'template') {
      await this.prisma.template.delete({
        where: { id },
      });
    } else {
      await this.prisma.task.delete({
        where: { id },
      });
    }

    await this.operationLog.log({
      userId,
      action: 'permanent_delete',
      module: 'recycle-bin',
      objectId: id,
      objectType: type,
      details: { type, id },
    });
  }

  async batchRestore(type: RecycleBinType, ids: string[], userId: string, role: string) {
    // 仅管理员可批量恢复
    if (role !== 'admin') {
      throw new BusinessException(ErrorCode.FORBIDDEN, '仅管理员可批量恢复项目');
    }

    if (!ids || ids.length === 0) {
      return;
    }

    if (type === 'document') {
      await Promise.all(
        ids.map((id) =>
          this.prisma.document.update({
            where: { id },
            data: { deletedAt: null },
          }),
        ),
      );
    } else if (type === 'template') {
      await Promise.all(
        ids.map((id) =>
          this.prisma.template.update({
            where: { id },
            data: { deletedAt: null },
          }),
        ),
      );
    } else {
      await Promise.all(
        ids.map((id) =>
          this.prisma.task.update({
            where: { id },
            data: { deletedAt: null },
          }),
        ),
      );
    }

    await this.operationLog.log({
      userId,
      action: 'batch_restore',
      module: 'recycle-bin',
      objectId: ids.join(','),
      objectType: type,
      details: { type, count: ids.length },
    });
  }

  async batchPermanentDelete(type: RecycleBinType, ids: string[], userId: string, role: string) {
    // 仅管理员可批量永久删除
    if (role !== 'admin') {
      throw new BusinessException(ErrorCode.FORBIDDEN, '仅管理员可批量永久删除项目');
    }

    if (!ids || ids.length === 0) {
      return;
    }

    if (type === 'document') {
      await Promise.all(
        ids.map((id) =>
          this.prisma.document.delete({
            where: { id },
          }),
        ),
      );
    } else if (type === 'template') {
      await Promise.all(
        ids.map((id) =>
          this.prisma.template.delete({
            where: { id },
          }),
        ),
      );
    } else {
      await Promise.all(
        ids.map((id) =>
          this.prisma.task.delete({
            where: { id },
          }),
        ),
      );
    }

    await this.operationLog.log({
      userId,
      action: 'batch_permanent_delete',
      module: 'recycle-bin',
      objectId: ids.join(','),
      objectType: type,
      details: { type, count: ids.length },
    });
  }
}
