import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ImportService } from './import.service';

@ApiTags('批量导入')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post('users')
  @ApiOperation({ summary: '批量导入用户（管理员）' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  async importUsers(@UploadedFile() file: Express.Multer.File) {
    this.validateFile(file);
    return this.service.importUsers(file.buffer);
  }

  @Post('documents')
  @ApiOperation({ summary: '批量导入文档元数据（管理员）' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  async importDocuments(@UploadedFile() file: Express.Multer.File, @Request() req: { user: { sub: string } }) {
    this.validateFile(file);
    return this.service.importDocuments(file.buffer, req.user.sub);
  }

  @Get('templates/users')
  @ApiOperation({ summary: '下载用户导入模板' })
  async getUserTemplate(@Res() res: Response) {
    const buffer = this.service.getUserTemplate();
    this.sendExcelFile(res, buffer, 'users_template');
  }

  @Get('templates/documents')
  @ApiOperation({ summary: '下载文档导入模板' })
  async getDocumentTemplate(@Res() res: Response) {
    const buffer = this.service.getDocumentTemplate();
    this.sendExcelFile(res, buffer, 'documents_template');
  }

  private validateFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请上传文件');
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('仅支持 Excel 文件（.xlsx/.xls）');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }
  }

  private sendExcelFile(res: Response, buffer: Buffer, prefix: string) {
    const filename = `${prefix}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }
}
