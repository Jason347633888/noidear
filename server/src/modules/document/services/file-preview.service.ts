import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as crypto from 'crypto';
import * as childProcess from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../../common/services';
import { BusinessException, ErrorCode } from '../../../common/exceptions/business.exception';
import { isEffectiveCompatible } from '../constants/document-control.constants';

export interface PreviewResult {
  type: 'pdf' | 'word' | 'excel' | 'markdown' | 'unknown';
  url?: string;
  fileName: string;
  message?: string;
}

@Injectable()
export class FilePreviewService {
  private readonly logger = new Logger(FilePreviewService.name);
  private readonly PREVIEW_CACHE_PREFIX = 'previews/';
  private readonly PREVIEW_CACHE_TTL_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * 文件格式转换接口（BR-050）
   * POST /file-preview/convert
   * 接收 MinIO 路径，调用 LibreOffice 转换为 HTML，返回缓存后的 HTML URL
   * 若 LibreOffice 未安装，提供优雅降级（返回 mock HTML）
   */
  async convertToHtml(minioPath: string): Promise<{ htmlUrl: string; cached: boolean }> {
    try {
      // 检查缓存（按源文件路径 MD5 命名）
      const cacheKey = this.buildCacheKey(minioPath);
      const cacheExists = await this.storage.fileExists(cacheKey);

      if (cacheExists) {
        const meta = await this.storage.getFileMetadata(cacheKey);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.PREVIEW_CACHE_TTL_DAYS);
        if (meta.lastModified > cutoff) {
          const htmlUrl = await this.storage.getSignedUrl(cacheKey, 3600);
          return { htmlUrl, cached: true };
        }
      }

      // 下载源文件
      const fileBuffer = await this.storage.getFile(minioPath);
      const ext = path.extname(minioPath).toLowerCase();

      // 尝试使用 LibreOffice 转换
      const htmlContent = await this.convertWithLibreOffice(fileBuffer, ext);

      // 上传 HTML 到缓存
      const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
      await this.uploadHtmlCache(cacheKey, htmlBuffer);

      const htmlUrl = await this.storage.getSignedUrl(cacheKey, 3600);
      return { htmlUrl, cached: false };
    } catch (error) {
      this.logger.error(`文件转换失败 ${minioPath}: ${error.message}`, error.stack);
      throw new BusinessException(ErrorCode.DATABASE_ERROR, `文件转换失败: ${error.message}`);
    }
  }

  private buildCacheKey(minioPath: string): string {
    const md5 = crypto.createHash('md5').update(minioPath).digest('hex');
    return `${this.PREVIEW_CACHE_PREFIX}${md5}.html`;
  }

  private async convertWithLibreOffice(fileBuffer: Buffer, ext: string): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'preview-'));
    const inputFile = path.join(tempDir, `input${ext}`);
    const outputDir = tempDir;

    try {
      await fs.writeFile(inputFile, fileBuffer);

      return await new Promise<string>((resolve) => {
        const proc = childProcess.spawn('libreoffice', [
          '--headless', '--convert-to', 'html', '--outdir', outputDir, inputFile,
        ], { timeout: 30000 });

        proc.on('close', async (code) => {
          if (code !== 0) {
            // LibreOffice 不可用，返回降级 HTML
            resolve(this.buildFallbackHtml(ext));
            return;
          }
          try {
            const files = await fs.readdir(outputDir);
            const htmlFile = files.find((f) => f.endsWith('.html') && f !== path.basename(inputFile));
            if (htmlFile) {
              const content = await fs.readFile(path.join(outputDir, htmlFile), 'utf-8');
              resolve(content);
            } else {
              resolve(this.buildFallbackHtml(ext));
            }
          } catch {
            resolve(this.buildFallbackHtml(ext));
          }
        });

        proc.on('error', () => resolve(this.buildFallbackHtml(ext)));
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private buildFallbackHtml(ext: string): string {
    return `<!DOCTYPE html><html><body><p>文件预览不可用（需要安装 LibreOffice 以支持 ${ext} 格式预览）</p></body></html>`;
  }

  private async uploadHtmlCache(cacheKey: string, htmlBuffer: Buffer): Promise<void> {
    await this.storage.uploadBuffer(htmlBuffer, cacheKey);
  }


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
    await this.assertFileAccess(document, userId, role);

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
    await this.assertFileAccess(document, userId, role);

    // 根据文件类型返回不同的预览方式
    const fileType = this.getFileType(document.fileType, document.fileName);

    if (fileType === 'pdf') {
      // PDF 返回签名 URL，浏览器原生支持预览（有效期 15 分钟）
      const url = await this.storage.getSignedUrl(document.filePath, 900);
      return {
        type: 'pdf',
        url,
        fileName: document.fileName,
      };
    }

    if (fileType === 'markdown') {
      return {
        type: 'markdown',
        fileName: document.fileName,
        message: 'Markdown 文件使用系统正文预览',
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
  async assertFileAccess(
    document: any,
    userId: string,
    role: string,
  ): Promise<void> {
    return this.checkDownloadPermission(document, userId, role);
  }

  private async checkDownloadPermission(
    document: any,
    userId: string,
    role: string,
  ): Promise<void> {
    // 管理员可以下载所有文档
    if (role === 'admin') {
      return;
    }

    // 已生效的文档所有人都可以下载
    if (isEffectiveCompatible(document.status)) {
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
      if (document.creatorId === userId) {
        return;
      }

      // 优先从新系统查询审批人（有 approvalInstanceId 的文档）
      if (document.approvalInstanceId) {
        const pendingTask = await this.prisma.approvalTask.findFirst({
          where: { instanceId: document.approvalInstanceId, status: 'PENDING' },
        });
        if (pendingTask?.assigneeUserId === userId) {
          return;
        }
        // 若 task 按角色分配（assigneeUserId 为空），允许具有对应角色的用户下载
        // 角色校验由上层 role 参数保障，此处宽松放行有 PENDING task 的同角色人员
        if (pendingTask?.assigneeRoleCode && pendingTask.assigneeRoleCode === role) {
          return;
        }
      } else {
        // LEGACY: 旧 Approval 表兼容路径（历史文档 approvalInstanceId = null）
        const approval = await this.prisma.approval.findFirst({
          where: { documentId: document.id, status: 'pending' },
        });
        if (approval?.approverId === userId) {
          return;
        }
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
  private getFileType(mimeType: string, fileName = ''): PreviewResult['type'] {
    const lowerFileName = fileName.toLowerCase();
    if (mimeType.includes('pdf')) {
      return 'pdf';
    }
    if (mimeType.includes('markdown') || lowerFileName.endsWith('.md') || lowerFileName.endsWith('.markdown')) {
      return 'markdown';
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
