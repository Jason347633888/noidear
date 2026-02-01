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

  private async generateDocumentNumber(level: number, departmentId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    let rule = await this.prisma.numberRule.findUnique({
      where: { level_departmentId: { level, departmentId } },
    });

    if (!rule) {
      rule = await this.prisma.numberRule.create({
        data: { id: this.snowflake.nextId(), level, departmentId, sequence: 0 },
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

  async create(dto: CreateDocumentDto, file: Express.Multer.File, userId: string) {
    const number = await this.generateDocumentNumber(dto.level, userId);
    const uploadResult = await this.storage.uploadFile(file, `documents/level${dto.level}`);

    return this.prisma.document.create({
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
  }

  async findAll(query: DocumentQueryDto, userId: string, role: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { level, keyword, status } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { level, deletedAt: null };

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

    return { list, total, page, limit };
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id, deletedAt: null },
    }) as unknown as any;

    if (!document) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    return document;
  }

  async update(id: string, dto: UpdateDocumentDto, file: Express.Multer.File | undefined, userId: string) {
    const document = await this.findOne(id);

    if (document.status !== 'draft') {
      throw new BusinessException(ErrorCode.CONFLICT, '只能修改草稿状态的文档');
    }

    if (file) {
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

  async remove(id: string, userId: string) {
    const document = await this.findOne(id);

    if (document.creatorId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '只能删除自己创建的文档');
    }

    if (document.status === 'approved') {
      throw new BusinessException(ErrorCode.CONFLICT, '已发布的文档不能删除');
    }

    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.storage.deleteFile(document.filePath);

    return { success: true };
  }

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

  async findPendingApprovals(userId: string, role: string) {
    const where: Record<string, unknown> = { status: 'pending', deletedAt: null };

    if (role === 'leader') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        where.creator = { departmentId: user.departmentId };
      }
    }

    return this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }) as unknown as any[];
  }
}
