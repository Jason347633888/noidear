import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { FilePreviewService } from './services';
import { DocumentReferenceService } from './services/document-reference.service';
import { RecordFormLandingService } from './services/record-form-landing.service';
import { DocumentReferenceHealthService } from './services/document-reference-health.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto, ArchiveDocumentDto, CreateGenericDocumentReferenceDto, UpdateMarkdownDto } from './dto';
import { BatchConfirmRecordFormLandingDto, ConfirmRecordFormLandingDto, UpdateRecordFormLandingEntryDto } from './dto/document-control.dto';
import { RestoreDocumentDto } from './dto/archive-document.dto';
import { PublishDocumentDto } from './dto/document-lifecycle.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ApiTags('文档管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ModuleKey('document_approval')
@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly lifecycleSvc: DocumentLifecycleService,
    private readonly filePreviewService: FilePreviewService,
    private readonly documentReferenceService: DocumentReferenceService,
    private readonly recordFormLandingService: RecordFormLandingService,
    private readonly referenceHealthService: DocumentReferenceHealthService,
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
    return this.documentService.findAll(query, req.user.id, req.user.roleCode);
  }

  @Get('due-soon')
  @ApiOperation({ summary: '查询即将到期复审的文件' })
  getDueSoon(@Query('days') days?: string) {
    return this.lifecycleSvc.getDueSoon(days ? parseInt(days, 10) : 30);
  }

  // =============================
  // Task 6: 记录表单落地索引
  // =============================

  @Get('record-form-index')
  @ApiOperation({ summary: '查询04记录表单落地索引' })
  listRecordFormIndex(
    @Query('keyword') keyword?: string,
    @Query('department') department?: string,
    @Query('templateGroupId') templateGroupId?: string,
  ) {
    return this.recordFormLandingService.list({ keyword, department, templateGroupId });
  }

  @Post('record-form-index/batch-confirm-suggested')
  @ApiOperation({ summary: '批量确认选中表单的落地建议' })
  batchConfirmRecordFormLanding(
    @Body() dto: BatchConfirmRecordFormLandingDto,
    @Req() req: any,
    @Ownership() ownership: OwnershipContext,
  ) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('Admin access required');
    return this.recordFormLandingService.batchConfirmSuggested(dto.codes, req.user?.id || 'system');
  }

  @Get('record-form-index/:code/suggestion')
  @ApiOperation({ summary: '获取源表单落地建议' })
  getRecordFormLandingSuggestion(@Param('code') code: string) {
    return this.recordFormLandingService.suggest(code);
  }

  @Post('record-form-index/:code/confirm')
  @ApiOperation({ summary: '确认源表单落地关系' })
  confirmRecordFormLanding(
    @Param('code') code: string,
    @Body() dto: ConfirmRecordFormLandingDto,
    @Req() req: any,
    @Ownership() ownership: OwnershipContext,
  ) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('Admin access required');
    return this.recordFormLandingService.confirm(code, dto, req.user.id);
  }

  @Get('record-form-index/:code/field-coverage')
  @ApiOperation({ summary: '查询源表单字段覆盖差异' })
  getRecordFormFieldCoverage(@Param('code') code: string) {
    return this.recordFormLandingService.getFieldCoverage(code);
  }

  @Get('record-form-index/:code')
  @ApiOperation({ summary: '查询单张源表单落地信息' })
  getRecordFormIndexEntry(@Param('code') code: string) {
    return this.recordFormLandingService.get(code);
  }

  @Patch('record-form-index/:code')
  @ApiOperation({ summary: '维护源表单目标入口' })
  updateRecordFormIndexEntry(
    @Param('code') code: string,
    @Body() dto: UpdateRecordFormLandingEntryDto,
    @Ownership() ownership: OwnershipContext,
  ) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('Admin access required');
    return this.recordFormLandingService.upsertTarget(code, dto);
  }

  @Get('reference-health/issues')
  @ApiOperation({ summary: '查询文档引用问题清单' })
  getReferenceHealthIssues() {
    return this.referenceHealthService.listIssues();
  }

  @Get(':id')
  @ApiOperation({ summary: '查询文档详情' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.documentService.findOne(id, req.user.id, req.user.roleCode);
  }

  @Get(':id/reference-health')
  @ApiOperation({ summary: '查询单个文档引用健康度' })
  async getDocumentReferenceHealth(@Param('id') id: string, @Req() req: any) {
    return this.referenceHealthService.getDocumentHealth(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '查询文档版本历史' })
  async getVersionHistory(@Param('id') id: string, @Req() req: any) {
    return this.documentService.getVersionHistory(id, req.user.id, req.user.roleCode);
  }

  @Get(':id/versions/:version/preview')
  @ApiOperation({ summary: '获取历史版本预览信息' })
  async getVersionPreview(
    @Param('id') id: string,
    @Param('version') version: string,
    @Req() req: any,
  ) {
    return this.documentService.getVersionPreview(id, version, req.user.id, req.user.roleCode);
  }

  @Get(':id/versions/:version/download')
  @ApiOperation({ summary: '下载历史版本文件' })
  async downloadVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    return this.documentService.downloadVersion(id, version, req.user.id, req.user.roleCode, res);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: '停用文档' })
  async deactivate(@Param('id') id: string, @Req() req: any) {
    return this.documentService.deactivate(id, req.user.id, req.user.roleCode);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: '归档文档' })
  async archive(
    @Param('id') id: string,
    @Body() dto: ArchiveDocumentDto,
    @Req() req: any,
  ) {
    return this.documentService.archive(id, dto.reason, req.user.id, req.user.roleCode);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: '恢复归档文档' })
  async restore(
    @Param('id') id: string,
    @Body() dto: RestoreDocumentDto,
    @Req() req: any,
  ) {
    return this.documentService.restore(id, dto.reason, req.user.id, req.user.roleCode);
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

  @Patch(':id/markdown')
  @ApiOperation({ summary: '更新 Markdown 正文' })
  updateMarkdown(@Param('id') id: string, @Body() dto: UpdateMarkdownDto, @Req() req: any) {
    return this.documentService.updateMarkdown(id, req.user.id, req.user.roleCode, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文档' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.documentService.remove(id, req.user.id);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: '物理删除文档' })
  async permanentDelete(@Param('id') id: string, @Req() req: any) {
    return this.documentService.permanentDelete(id, req.user.id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: '提交审批' })
  async submitForApproval(@Param('id') id: string, @Req() req: any) {
    return this.documentService.submitForApproval(id, req.user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: '下载文档文件' })
  async downloadFile(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    return this.filePreviewService.downloadFile(id, req.user.id, req.user.roleCode, res);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: '获取文档预览信息' })
  async getPreviewUrl(@Param('id') id: string, @Req() req: any) {
    return this.filePreviewService.getPreviewUrl(id, req.user.id, req.user.roleCode);
  }

  // =============================
  // P2: 文件格式转换端点（BR-050）
  // =============================

  @Post('convert')
  @ApiOperation({ summary: '将 Word/Excel 转换为 HTML 预览（BR-050）' })
  async convertFile(@Body('minioPath') minioPath: string) {
    return this.filePreviewService.convertToHtml(minioPath);
  }

  // =============================
  // P2: 跨文档引用端点（BR-305/306）
  // =============================

  @Post(':id/references')
  @ApiOperation({ summary: '创建文档引用（BR-305）' })
  async createReference(
    @Param('id') id: string,
    @Body() dto: CreateGenericDocumentReferenceDto,
  ) {
    return this.documentReferenceService.createReference(id, dto);
  }

  @Get(':id/references')
  @ApiOperation({ summary: '查询文档的所有引用（BR-305）' })
  async getReferences(@Param('id') id: string) {
    return this.documentReferenceService.getReferences(id);
  }

  @Get(':id/reference-impact')
  @ApiOperation({ summary: '查询引用此文档的影响范围（BR-306）' })
  async getReferenceImpact(@Param('id') id: string) {
    return this.documentReferenceService.getReferenceImpact(id);
  }

  // =============================
  // Task 8: 文件生命周期管理
  // =============================

  @Patch(':id/publish')
  @ApiOperation({ summary: '发布文件（设为生效状态）' })
  publish(@Param('id') id: string, @Body() dto: PublishDocumentDto) {
    return this.lifecycleSvc.publish(id, dto);
  }

  @Post(':id/revisions')
  @ApiOperation({ summary: '发起文件修订草稿' })
  createRevision(@Param('id') id: string, @Req() req: any) {
    return this.documentService.createRevisionDraft(id, req.user.id);
  }
}
