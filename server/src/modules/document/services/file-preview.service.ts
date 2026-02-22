import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../../common/services';
import { BusinessException, ErrorCode } from '../../../common/exceptions/business.exception';

export interface PreviewResult {
  type: 'pdf' | 'word' | 'excel' | 'unknown';
  url?: string;
  fileName: string;
  message?: string;
}

@Injectable()
export class FilePreviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * 下载文件
   */
  async downloadFile(
    documentId: string,
    userId: string,
    role: string,
    res: Response,
  ): Promise<void> {
    // 查询文档
    const document = await this.prisma.document.findUnique({
      where: { id: documentId, deletedAt: null },
    });

    if (!document) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    // 检查文档状态
    if (document.status === 'inactive') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        '该文档已停用，无法下载',
      );
    }

    // 权限检查
    await this.checkDownloadPermission(document, userId, role);

    // 获取文件流
    const stream = await this.storage.getFileStream(document.filePath);

    // 设置响应头
    res.set({
      'Content-Type': document.fileType,
      'Content-Disposition': `attachment; filename="${document.fileName}"`,
    });

    // 流式传输文件
    stream.pipe(res);
  }

  /**
   * 获取预览 URL
   */
  async getPreviewUrl(
    documentId: string,
    userId: string,
    role: string,
  ): Promise<PreviewResult> {
    // 查询文档
    const document = await this.prisma.document.findUnique({
      where: { id: documentId, deletedAt: null },
    });

    if (!document) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    // 权限检查
    await this.checkDownloadPermission(document, userId, role);

    // 根据文件类型返回不同的预览方式
    const fileType = this.getFileType(document.fileType);

    if (fileType === 'pdf') {
      // PDF 返回签名 URL，浏览器原生支持预览（有效期 15 分钟）
      const url = await this.storage.getSignedUrl(document.filePath, 900);
      return {
        type: 'pdf',
        url,
        fileName: document.fileName,
      };
    }

    // Word/Excel 返回下载提示
    return {
      type: fileType,
      fileName: document.fileName,
      message: `${fileType.toUpperCase()} 文件暂不支持在线预览，请下载后查看`,
    };
  }

  /**
   * 检查下载权限
   */
  private async checkDownloadPermission(
    document: any,
    userId: string,
    role: string,
  ): Promise<void> {
    // 管理员可以下载所有文档
    if (role === 'admin') {
      return;
    }

    // 已发布的文档所有人都可以下载
    if (document.status === 'approved') {
      return;
    }

    // 草稿和被驳回的文档只有创建者可以下载
    if (document.status === 'draft' || document.status === 'rejected') {
      if (document.creatorId !== userId) {
        throw new BusinessException(
          ErrorCode.FORBIDDEN,
          `只能下载自己创建的草稿文档`,
        );
      }
      return;
    }

    // 待审批的文档：创建者和审批人可以下载
    if (document.status === 'pending') {
      // 获取审批记录
      const approval = await this.prisma.approval.findFirst({
        where: {
          documentId: document.id,
          status: 'pending',
        },
      });

      if (
        document.creatorId === userId ||
        approval?.approverId === userId
      ) {
        return;
      }

      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `只有文档创建者或审批人可以下载待审批的文档`,
      );
    }

    throw new BusinessException(
      ErrorCode.FORBIDDEN,
      `无权下载该文档`,
    );
  }

  /**
   * 判断文件类型
   */
  private getFileType(mimeType: string): 'pdf' | 'word' | 'excel' | 'unknown' {
    if (mimeType.includes('pdf')) {
      return 'pdf';
    }
    if (
      mimeType.includes('word') ||
      mimeType.includes('msword') ||
      mimeType.includes('wordprocessingml')
    ) {
      return 'word';
    }
    if (
      mimeType.includes('sheet') ||
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheetml')
    ) {
      return 'excel';
    }
    return 'unknown';
  }
}
