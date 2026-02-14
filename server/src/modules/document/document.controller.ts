import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { FilePreviewService } from './services';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto, ArchiveDocumentDto, ObsoleteDocumentDto, ApproveDocumentDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('文档管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly filePreviewService: FilePreviewService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: '上传文档' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body() dto: CreateDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /^(application\/pdf|application\/vnd\.(ms-excel|openxmlformats-officedocument\.(spreadsheetml\.sheet|wordprocessingml\.document))|application\/msword)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.documentService.create(dto, file, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '查询文档列表' })
  async findAll(@Query() query: DocumentQueryDto, @Req() req: any) {
    return this.documentService.findAll(query, req.user.id, req.user.role);
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: '待我审批' })
  async findPendingApprovals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 20, 100);
    return this.documentService.findPendingApprovals(
      req.user.id,
      req.user.role,
      pageNum,
      limitNum,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '查询文档详情' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.documentService.findOne(id, req.user.id, req.user.role);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '查询文档版本历史' })
  async getVersionHistory(@Param('id') id: string, @Req() req: any) {
    return this.documentService.getVersionHistory(id, req.user.id, req.user.role);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: '停用文档' })
  async deactivate(@Param('id') id: string, @Req() req: any) {
    return this.documentService.deactivate(id, req.user.id, req.user.role);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: '归档文档' })
  async archive(
    @Param('id') id: string,
    @Body() dto: ArchiveDocumentDto,
    @Req() req: any,
  ) {
    return this.documentService.archive(id, dto.reason, req.user.id, req.user.role);
  }

  @Post(':id/obsolete')
  @ApiOperation({ summary: '作废文档' })
  async obsolete(
    @Param('id') id: string,
    @Body() dto: ObsoleteDocumentDto,
    @Req() req: any,
  ) {
    return this.documentService.obsolete(id, dto.reason, req.user.id, req.user.role);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新文档' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    return this.documentService.update(id, dto, file, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文档' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.documentService.remove(id, req.user.id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: '提交审批' })
  async submitForApproval(@Param('id') id: string, @Req() req: any) {
    return this.documentService.submitForApproval(id, req.user.id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '审批文档' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveDocumentDto,
    @Req() req: any,
  ) {
    return this.documentService.approve(id, dto.status, dto.comment, req.user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: '下载文档文件' })
  async downloadFile(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    return this.filePreviewService.downloadFile(id, req.user.id, req.user.role, res);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: '获取文档预览信息' })
  async getPreviewUrl(@Param('id') id: string, @Req() req: any) {
    return this.filePreviewService.getPreviewUrl(id, req.user.id, req.user.role);
  }
}
