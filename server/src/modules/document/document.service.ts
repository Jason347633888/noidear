import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { Snowflake } from '../../common/utils/snowflake';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto } from './dto';

@Injectable()
export class DocumentService {
  private readonly snowflake: Snowflake;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    this.snowflake = new Snowflake(1, 1);
  }

  /**
   * 生成文档编号
   */
  private async generateDocumentNumber(level: number, departmentId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // 获取或创建编号规则
    let rule = await this.prisma.numberRule.findUnique({
      where: { level_departmentId: { level, departmentId } },
    });

    if (!rule) {
      rule = await this.prisma.numberRule.create({
        data: { level, departmentId, sequence: 0 },
      });
    }

    const sequence = rule.sequence + 1;
    await this.prisma.numberRule.update({
      where: { level_departmentId: { level, departmentId } },
      data: { sequence },
    });

    const seqStr = String(sequence).padStart(4, '0');
    return `${year}${month}-${level}-${seqStr}`;
  }

  /**
   * 创建文档
   */
  async create(dto: CreateDocumentDto, file: Express.Multer.File, userId: string) {
    const number = await this.generateDocumentNumber(dto.level, userId);

    // 上传文件到 MinIO
    const uploadResult = await this.storage.uploadFile(file, `documents/level${dto.level}`);

    // 创建文档记录
    const document = await this.prisma.document.create({
      data: {
        id: this.snowflake.nextId(),
        level: dto.level,
        number,
        title: dto.title,
        filePath: uploadResult.path,
        fileName: file.originalname,
        fileSize: BigInt(file.size),
        fileType: file.mimetype,
        status: 'draft',
        creatorId: userId,
      },
    });

    return document;
  }

  /**
   * 查询文档列表
   */
  async findAll(query: DocumentQueryDto, userId: string, role: string) {
    const { page, limit, level, keyword, status } = query;
    const skip = (page - 1) * limit;

    // 普通用户只能看到自己创建的文档
    const where: Record<string, unknown> = {
      level,
      deletedAt: null,
    };

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
        include: {
          creator: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  /**
   * 查询单个文档
   */
  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id, deletedAt: null },
      include: {
        creator: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        versions: { orderBy: { version: 'desc' } },
      },
    });

    if (!document) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    return document;
  }

  /**
   * 更新文档
   */
  async update(id: string, dto: UpdateDocumentDto, file: Express.Multer.File | undefined, userId: string) {
    const document = await this.findOne(id);

    if (document.status !== 'draft') {
      throw new BusinessException(ErrorCode.CONFLICT, '只能修改草稿状态的文档');
    }

    if (file) {
      // 保存旧版本
      await this.prisma.documentVersion.create({
        data: {
          id: this.snowflake.nextId(),
          documentId: id,
          version: document.version,
          filePath: document.filePath,
          fileName: document.fileName,
          fileSize: document.fileSize,
          creatorId: userId,
        },
      });

      // 上传新文件
      const uploadResult = await this.storage.uploadFile(file, `documents/level${document.level}`);

      return this.prisma.document.update({
        where: { id },
        data: {
          title: dto.title ?? document.title,
          filePath: uploadResult.path,
          fileName: file.originalname,
          fileSize: BigInt(file.size),
          fileType: file.mimetype,
          version: { increment: 0.1 },
        },
      });
    }

    return this.prisma.document.update({
      where: { id },
      data: { title: dto.title ?? document.title },
    });
  }

  /**
   * 删除文档
   */
  async remove(id: string, userId: string) {
    const document = await this.findOne(id);

    if (document.creatorId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '只能删除自己创建的文档');
    }

    if (document.status === 'approved') {
      throw new BusinessException(ErrorCode.CONFLICT, '已发布的文档不能删除');
    }

    // 软删除
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // 删除文件
    await this.storage.deleteFile(document.filePath);

    return { success: true };
  }

  /**
   * 提交审批
   */
  async submitForApproval(id: string, userId: string) {
    const document = await this.findOne(id);

    if (document.creatorId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '只能提交自己创建的文档');
    }

    if (document.status !== 'draft') {
      throw new BusinessException(ErrorCode.CONFLICT, '只能提交草稿状态的文档');
    }

    return this.prisma.document.update({
      where: { id },
      data: { status: 'pending' },
    });
  }

  /**
   * 获取待审批列表
   */
  async findPendingApprovals(userId: string, role: string) {
    const where: Record<string, unknown> = { status: 'pending', deletedAt: null };

    // 部门负责人只能审批本部门创建的文档
    if (role === 'leader') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        where.creator = { departmentId: user.departmentId };
      }
    }

    return this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true, departmentId: true } },
      },
    });
  }
}
