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
import { ForbiddenException } from '@nestjs/common';
import { DocumentService } from './document.service';
import { FilePreviewService } from './services';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto, ArchiveDocumentDto, ObsoleteDocumentDto, ApproveDocumentDto } from './dto';
import { RestoreDocumentDto } from './dto/archive-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CheckPermission } from '../../common/decorators/permission.decorator';
import { ExportService } from '../export/export.service';
import { ExportDocumentsDto } from '../export/dto';
import { DepartmentPermissionService } from '../department-permission/department-permission.service';
import { StatisticsService } from '../statistics/statistics.service';
import { StatisticsCacheInterceptor } from '../../common/interceptors/statistics-cache.interceptor';

@ApiTags('文档管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(StatisticsCacheInterceptor)
@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly filePreviewService: FilePreviewService,
    private readonly exportService: ExportService,
    private readonly departmentPermissionService: DepartmentPermissionService,
    private readonly statisticsService: StatisticsService,
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

  @Get('export')
  @ApiOperation({ summary: '导出文档列表' })
  async export(@Query() dto: ExportDocumentsDto, @Res() res: Response, @Req() req: any) {
    try {
      // HIGH-1: 传递用户信息进行权限过滤
      const buffer = await this.exportService.exportDocuments(dto, req.user);
      const filename = `documents_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '导出失败',
        error: error.message,
      });
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '查询文档详情' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const document = await this.documentService.findOne(id, req.user.id, req.user.role);

    // BR-356: 部门边界检查
    // BR-357: 跨部门权限验证
    const canAccess = await this.departmentPermissionService.canAccessDepartmentResource(
      req.user.id,
      document.departmentId,
      'view',
      'document',
    );

    if (!canAccess) {
      throw new ForbiddenException('无权访问该部门的文档');
    }

    return document;
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '查询文档版本历史' })
  async getVersionHistory(@Param('id') id: string, @Req() req: any) {
    return this.documentService.getVersionHistory(id, req.user.id, req.user.role);
  }

  @Get(':id/versions/:v1/compare/:v2')
  @ApiOperation({ summary: '对比两个版本' })
  async compareVersions(
    @Param('id') id: string,
    @Param('v1') v1: string,
    @Param('v2') v2: string,
    @Req() req: any,
  ) {
    return this.documentService.compareVersions(id, v1, v2, req.user.id);
  }

  @Post(':id/versions/:targetVersion/rollback')
  @ApiOperation({ summary: '回滚到指定版本' })
  async rollbackVersion(
    @Param('id') id: string,
    @Param('targetVersion') targetVersion: string,
    @Req() req: any,
  ) {
    return this.documentService.rollbackVersion(id, targetVersion, req.user.id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: '停用文档' })
  async deactivate(@Param('id') id: string, @Req() req: any) {
    return this.documentService.deactivate(id, req.user.id, req.user.role);
  }

  @Post(':id/archive')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:archive')
  @ApiOperation({ summary: '归档文档' })
  async archive(
    @Param('id') id: string,
    @Body() dto: ArchiveDocumentDto,
    @Req() req: any,
  ) {
    return this.documentService.archive(id, dto.reason, req.user.id, req.user.role);
  }

  @Post(':id/obsolete')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:obsolete')
  @ApiOperation({ summary: '作废文档' })
  async obsolete(
    @Param('id') id: string,
    @Body() dto: ObsoleteDocumentDto,
    @Req() req: any,
  ) {
    return this.documentService.obsolete(id, dto.reason, req.user.id, req.user.role);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: '恢复归档文档' })
  async restore(
    @Param('id') id: string,
    @Body() dto: RestoreDocumentDto,
    @Req() req: any,
  ) {
    return this.documentService.restore(id, dto.reason, req.user.id, req.user.role);
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

  @Delete(':id/permanent')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:permanent_delete')
  @ApiOperation({ summary: '物理删除文档' })
  async permanentDelete(@Param('id') id: string, @Req() req: any) {
    return this.documentService.permanentDelete(id, req.user.id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: '提交审批' })
  async submitForApproval(@Param('id') id: string, @Req() req: any) {
    return this.documentService.submitForApproval(id, req.user.id);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: '撤回审批' })
  async withdraw(@Param('id') id: string, @Req() req: any) {
    return this.documentService.withdraw(id, req.user.id);
  }

  @Post(':id/approve')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:approve')
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
