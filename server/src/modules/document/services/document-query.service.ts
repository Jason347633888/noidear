import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { convertBigIntToNumber } from '../../../common/utils';
import { BusinessException, ErrorCode } from '../../../common/exceptions/business.exception';
import { DocumentQueryDto } from '../dto';

@Injectable()
export class DocumentQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DocumentQueryDto, userId: string, role: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { level, keyword, status } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (level !== undefined && level !== null) {
      where.level = level;
    }

    if (role === 'user') {
      where.creatorId = userId;
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { number: { contains: keyword } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [list, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }) as unknown as any[],
      this.prisma.document.count({ where }),
    ]);

    // 批量获取创建人和审批人信息
    const creatorIds = [...new Set(list.map(d => d.creatorId).filter(Boolean))];
    const approverIds = [...new Set(list.map(d => d.approverId).filter(Boolean))];
    const userIds = [...new Set([...creatorIds, ...approverIds])];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // 附加创建人和审批人信息
    const enrichedList = list.map(doc => ({
      ...doc,
      creator: doc.creatorId ? userMap.get(doc.creatorId) || null : null,
      approver: doc.approverId ? userMap.get(doc.approverId) || null : null,
    }));

    return { list: convertBigIntToNumber(enrichedList), total, page, limit };
  }

  async findOne(id: string, userId: string, role: string) {
    const document = await this.prisma.document.findUnique({
      where: { id, deletedAt: null },
    }) as unknown as any;

    if (!document) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    // 权限检查：普通用户只能查看自己创建的文档
    if (role === 'user' && document.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `无权访问文档 [${document.number}]，该文档属于其他用户`,
      );
    }

    return convertBigIntToNumber(document);
  }

  async findPendingApprovals(userId: string, role: string) {
    const where: any = { status: 'pending', deletedAt: null };

    // 如果是leader角色，需要过滤同部门的文档
    let departmentUserIds: string[] = [];
    if (role === 'leader') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.departmentId) {
        const departmentUsers = await this.prisma.user.findMany({
          where: { departmentId: user.departmentId },
          select: { id: true },
        });
        departmentUserIds = departmentUsers.map(u => u.id);
        where.creatorId = { in: departmentUserIds };
      }
    }

    const list = (await this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })) as unknown as any[];

    // 批量获取创建人信息
    const creatorIds = [...new Set(list.map(d => d.creatorId).filter(Boolean))];
    const creators = await this.prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, name: true },
    });
    const creatorMap = new Map(creators.map(u => [u.id, u]));

    // 附加创建人信息
    const enrichedList = list.map(doc => ({
      ...doc,
      creator: doc.creatorId ? creatorMap.get(doc.creatorId) || null : null,
    }));

    return convertBigIntToNumber(enrichedList);
  }
}
