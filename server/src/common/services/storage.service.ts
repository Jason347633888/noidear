import { Client } from 'minio';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException, ErrorCode } from '../exceptions/business.exception';

export interface UploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class StorageService {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const useSsl = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'documents');

    this.client = new Client({
      endPoint: endpoint,
      port,
      useSSL: useSsl,
      accessKey,
      secretKey,
    });
  }

  /**
   * 确保 bucket 存在
   */
  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadResult> {
    try {
      await this.ensureBucket();

      const ext = this.getFileExtension(file.originalname);
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`;
      const path = `${folder}/${filename}`;

      await this.client.putObject(this.bucket, path, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });

      return {
        url: `/${this.bucket}/${path}`,
        path,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      throw new BusinessException(
        ErrorCode.DATABASE_ERROR,
        '文件上传失败',
        error,
      );
    }
  }

  /**
   * 上传文件流
   */
  async uploadStream(
    stream: Buffer,
    filename: string,
    mimetype: string,
    folder: string = 'uploads',
  ): Promise<UploadResult> {
    try {
      await this.ensureBucket();

      const ext = this.getFileExtension(filename);
      const newFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`;
      const path = `${folder}/${newFilename}`;

      await this.client.putObject(this.bucket, path, stream, stream.length, {
        'Content-Type': mimetype,
      });

      return {
        url: `/${this.bucket}/${path}`,
        path,
        filename,
        size: stream.length,
        mimetype,
      };
    } catch (error) {
      throw new BusinessException(
        ErrorCode.DATABASE_ERROR,
        '文件上传失败',
        error,
      );
    }
  }

  /**
   * 获取文件URL
   */
  getFileUrl(path: string): string {
    return `/${this.bucket}/${path}`;
  }

  /**
   * 删除文件
   */
  async deleteFile(path: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, path);
    } catch (error) {
      throw new BusinessException(
        ErrorCode.DATABASE_ERROR,
        '文件删除失败',
        error,
      );
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件
   */
  async getFile(path: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucket, path);
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '文件不存在',
        error,
      );
    }
  }

  /**
   * 获取文件签名URL（临时访问链接）
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await this.client.presignedGetObject(this.bucket, path, expiresIn);
    } catch (error) {
      throw new BusinessException(
        ErrorCode.DATABASE_ERROR,
        '获取文件链接失败',
        error,
      );
    }
  }

  /**
   * 复制文件
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    try {
      await this.client.copyObject(this.bucket, destPath, `/${this.bucket}/${sourcePath}`);
    } catch (error) {
      throw new BusinessException(
        ErrorCode.DATABASE_ERROR,
        '文件复制失败',
        error,
      );
    }
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
  }
}
