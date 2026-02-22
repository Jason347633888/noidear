import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MobileService } from './mobile.service';
import { UploadResponseDto, BatchUploadResponseDto } from './dto';

/**
 * 移动端文件上传控制器
 *
 * 注意：此 API 处理移动端现场拍照和电子签名的图片上传，
 * 与文档管理模块的业务文件上传（PDF/Word/Excel）是不同场景。
 * 移动端仅允许上传图片格式（JPG/JPEG/PNG），用于表单填写中的
 * 拍照取证和电子签名功能。
 */
@ApiTags('移动端')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Post('upload')
  @ApiOperation({ summary: '移动端单文件上传（现场拍照/签名图片）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '现场拍照或签名图片（JPG/JPEG/PNG，最大 5MB）',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: { id: string } },
  ): Promise<UploadResponseDto> {
    return this.mobileService.uploadFile(file, req.user.id);
  }

  @Post('upload/batch')
  @ApiOperation({ summary: '移动端批量文件上传（现场拍照图片，最多9张）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: '现场拍照图片数组（JPG/JPEG/PNG，单个最大 5MB，最多 9 个）',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 9))
  async uploadBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: { user: { id: string } },
  ): Promise<BatchUploadResponseDto> {
    return this.mobileService.uploadFiles(files, req.user.id);
  }
}
