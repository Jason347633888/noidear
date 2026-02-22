import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { UploadResponseDto } from './dto/upload.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 200;

@Injectable()
export class MobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 上传单个文件（图片）并生成缩略图
   */
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadResponseDto> {
    this.validateFile(file);

    const dateFolder = this.getDateFolder();
    const folder = `mobile/${userId}/${dateFolder}`;

    try {
      // 上传原图到 MinIO
      const originalResult = await this.storageService.uploadFile(file, folder);

      // 生成并上传缩略图
      const thumbnailBuffer = await this.generateThumbnail(file.buffer);
      const thumbnailResult = await this.storageService.uploadStream(
        thumbnailBuffer,
        `thumb_${file.originalname}`,
        file.mimetype,
        `${folder}/thumbnails`,
      );

      // 保存上传记录
      await this.prisma.mobileUpload.create({
        data: {
          userId,
          originalUrl: originalResult.url,
          thumbnailUrl: thumbnailResult.url,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storagePath: originalResult.path,
        },
      });

      return {
        originalUrl: originalResult.url,
        thumbnailUrl: thumbnailResult.url,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        '文件上传失败',
        error,
      );
    }
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    files: Express.Multer.File[],
    userId: string,
  ): Promise<{ files: UploadResponseDto[]; successCount: number; failedCount: number }> {
    const results: UploadResponseDto[] = [];
    let failedCount = 0;

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, userId);
        results.push(result);
      } catch {
        failedCount++;
      }
    }

    return {
      files: results,
      successCount: results.length,
      failedCount,
    };
  }

  /**
   * 校验文件格式和大小
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '请选择要上传的文件',
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        `不支持的文件类型: ${file.mimetype}，仅支持 JPG、JPEG、PNG 格式`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        `文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大允许 5MB`,
      );
    }
  }

  /**
   * 使用 sharp 生成缩略图
   */
  async generateThumbnail(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        '缩略图生成失败',
        error,
      );
    }
  }

  /**
   * 获取日期文件夹名（YYYY-MM-DD）
   */
  private getDateFolder(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
