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
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ForbiddenException } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { FilePreviewService } from './services';
import { DocumentReferenceService } from './services/document-reference.service';
import { DocumentControlWorkbenchService } from './services/document-control-workbench.service';
import { RecordFormLandingService } from './services/record-form-landing.service';
import { DocumentReadRequirementService } from './services/document-read-requirement.service';
import { DocumentTrainingNeedService } from './services/document-training-need.service';
import { DocumentAuditCoverageService } from './services/document-audit-coverage.service';
import { DocumentImpactService } from './services/document-impact.service';
import { DocumentHealthService } from './services/document-health.service';
import { DocumentAuditChainService } from './services/document-audit-chain.service';
import { DocumentEvidenceChainService } from './services/document-evidence-chain.service';
import { DocumentReferenceHealthService } from './services/document-reference-health.service';
import { NumberRuleService } from './services/number-rule.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto, ArchiveDocumentDto, ObsoleteDocumentDto, ApproveDocumentDto, CreateGenericDocumentReferenceDto, WorkbenchQueryDto, WorkbenchIssueQueryDto, CreateReadRequirementDto, TrainingNeedActionDto, ImpactReviewCreateDto, ImpactItemUpdateDto, CoverageQueryDto, AuditChainQueryDto, UpdateMarkdownDto } from './dto';
import { UpdateRecordFormLandingEntryDto, UpsertNumberRuleDto } from './dto/document-control.dto';
import { PublishDocumentDto, RollbackDocumentVersionDto } from './dto/document-lifecycle.dto';
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
    private readonly lifecycleSvc: DocumentLifecycleService,
    private readonly filePreviewService: FilePreviewService,
    private readonly documentReferenceService: DocumentReferenceService,
    private readonly exportService: ExportService,
    private readonly departmentPermissionService: DepartmentPermissionService,
    private readonly statisticsService: StatisticsService,
    private readonly workbenchService: DocumentControlWorkbenchService,
    private readonly recordFormLandingService: RecordFormLandingService,
    private readonly readRequirementService: DocumentReadRequirementService,
    private readonly trainingNeedService: DocumentTrainingNeedService,
    private readonly auditCoverageService: DocumentAuditCoverageService,
    private readonly impactService: DocumentImpactService,
    private readonly healthService: DocumentHealthService,
    private readonly auditChainService: DocumentAuditChainService,
    private readonly evidenceChainService: DocumentEvidenceChainService,
    private readonly referenceHealthService: DocumentReferenceHealthService,
    private readonly numberRuleService: NumberRuleService,
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

  @Get('due-soon')
  @ApiOperation({ summary: '查询即将到期复审的文件' })
  getDueSoon(@Query('days') days?: string) {
    return this.lifecycleSvc.getDueSoon(days ? parseInt(days, 10) : 30);
  }

  @Get('control/workbench/issues')
  @ApiOperation({ summary: '文控工作台问题明细' })
  getControlWorkbenchIssues(@Query() query: WorkbenchIssueQueryDto) {
    return this.workbenchService.listIssues(query);
  }

  @Get('control/workbench')
  @ApiOperation({ summary: '文控工作台' })
  getControlWorkbench(@Query() query: WorkbenchQueryDto) {
    return this.workbenchService.getWorkbench(query.days ?? 30);
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

  @Get('record-form-index/:code')
  @ApiOperation({ summary: '查询单张源表单落地信息' })
  getRecordFormIndexEntry(@Param('code') code: string) {
    return this.recordFormLandingService.get(code);
  }

  @Patch('record-form-index/:code')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:control_manage')
  @ApiOperation({ summary: '维护源表单目标入口' })
  updateRecordFormIndexEntry(
    @Param('code') code: string,
    @Body() dto: UpdateRecordFormLandingEntryDto,
  ) {
    return this.recordFormLandingService.upsertTarget(code, dto);
  }

  // =============================
  // Task 6: 文档运控中心端点
  // =============================

  @Post(':id/read-requirements')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:control_manage')
  @ApiOperation({ summary: '创建阅读要求' })
  createReadRequirement(@Param('id') id: string, @Body() dto: CreateReadRequirementDto, @Req() req: any) {
    return this.readRequirementService.create(id, dto, req.user.id);
  }

  @Get(':id/read-status')
  @ApiOperation({ summary: '查询阅读状态' })
  getReadStatus(@Param('id') id: string) {
    return this.readRequirementService.getStatus(id);
  }

  @Get('control/training-needs')
  @ApiOperation({ summary: '列出培训需求' })
  listTrainingNeeds(@Query('status') status?: string) {
    return this.trainingNeedService.list(status);
  }

  @Post(':id/training-needs/suggest')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:control_manage')
  @ApiOperation({ summary: '建议培训需求' })
  suggestTrainingNeed(@Param('id') id: string, @Req() req: any) {
    return this.trainingNeedService.suggestForDocument(id, req.user.id);
  }

  @Post('control/training-needs/:id/accept')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:control_manage')
  @ApiOperation({ summary: '接受培训需求' })
  acceptTrainingNeed(@Param('id') id: string) {
    return this.trainingNeedService.accept(id);
  }

  @Post('control/training-needs/:id/dismiss')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:control_manage')
  @ApiOperation({ summary: '驳回培训需求' })
  dismissTrainingNeed(@Param('id') id: string, @Body() dto: TrainingNeedActionDto) {
    return this.trainingNeedService.dismiss(id, dto.reason);
  }

  @Post('control/training-needs/:id/link')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:control_manage')
  @ApiOperation({ summary: '关联培训项目' })
  linkTrainingNeed(@Param('id') id: string, @Body() dto: TrainingNeedActionDto) {
    return this.trainingNeedService.link(id, dto.linkedTrainingProjectId);
  }

  @Get('control/audit-coverage')
  @ApiOperation({ summary: '查询审核覆盖率' })
  getAuditCoverage(@Query() dto: CoverageQueryDto) {
    return this.auditCoverageService.getCoverage(new Date(dto.periodStart), new Date(dto.periodEnd));
  }

  @Post('control/impact-reviews')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:control_manage')
  @ApiOperation({ summary: '创建影响评审' })
  createImpactReview(@Body() dto: ImpactReviewCreateDto) {
    return this.impactService.createReview(dto);
  }

  @Patch('control/impact-items/:id')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:control_manage')
  @ApiOperation({ summary: '更新影响评审条目' })
  updateImpactItem(@Param('id') id: string, @Body() dto: ImpactItemUpdateDto) {
    return this.impactService.updateItem(id, dto);
  }

  @Get('control/health')
  @ApiOperation({ summary: '查询文控健康度' })
  getHealth(@Query('days') days?: string) {
    const parsed = days ? parseInt(days, 10) : 30;
    return this.healthService.getHealth(Number.isNaN(parsed) ? 30 : Math.min(Math.max(parsed, 1), 365));
  }

  @Get('control/audit-chain')
  @ApiOperation({ summary: '查询审计链' })
  getAuditChain(@Query() dto: AuditChainQueryDto) {
    return this.auditChainService.getChain(dto.sourceType, dto.sourceId, dto.maxDepth ?? 4);
  }

  @Get('control/evidence-chain')
  @ApiOperation({ summary: '证据链查询' })
  getEvidenceChain(
    @Query('sourceType') sourceType: string,
    @Query('sourceId') sourceId: string,
    @Query('maxDepth') maxDepth?: string,
  ): Promise<any> {
    if (!sourceType || !sourceId) {
      throw new BadRequestException('sourceType and sourceId are required');
    }
    const validTypes = ['document', 'record_template', 'record', 'change_event', 'audit_finding', 'corrective_action'];
    if (!validTypes.includes(sourceType)) {
      throw new BadRequestException(`Unsupported sourceType: ${sourceType}`);
    }
    return this.evidenceChainService.getChain({
      sourceType: sourceType as any,
      sourceId,
      maxDepth: maxDepth ? Number(maxDepth) : undefined,
    });
  }

  @Get('reference-health/issues')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:control_manage')
  @ApiOperation({ summary: '查询文档引用问题清单' })
  getReferenceHealthIssues() {
    return this.referenceHealthService.listIssues();
  }

  // =============================
  // Task 2: 文控编号规则管理
  // =============================

  @Get('number-rules')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:number_rule_manage')
  @ApiOperation({ summary: '查询文控编号规则' })
  listNumberRules() {
    return this.numberRuleService.list();
  }

  @Post('number-rules')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:number_rule_manage')
  @ApiOperation({ summary: '创建或更新文控编号规则' })
  upsertNumberRule(@Body() dto: UpsertNumberRuleDto) {
    return this.numberRuleService.upsert(dto);
  }

  @Post('number-rules/:id/deactivate')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:number_rule_manage')
  @ApiOperation({ summary: '停用文控编号规则' })
  deactivateNumberRule(@Param('id') id: string) {
    return this.numberRuleService.deactivate(id);
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

  @Get(':id/reference-health')
  @ApiOperation({ summary: '查询单个文档引用健康度' })
  async getDocumentReferenceHealth(@Param('id') id: string, @Req() req: any) {
    const document = await this.documentService.findOne(id, req.user.id, req.user.role);
    const canAccess = await this.departmentPermissionService.canAccessDepartmentResource(
      req.user.id,
      document.departmentId,
      'view',
      'document',
    );

    if (!canAccess) {
      throw new ForbiddenException('无权访问该部门的文档');
    }

    return this.referenceHealthService.getDocumentHealth(id);
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
  @UseGuards(PermissionGuard)
  @CheckPermission('document:control_manage')
  @ApiOperation({ summary: '回滚到指定版本' })
  async rollbackVersion(
    @Param('id') id: string,
    @Param('targetVersion') targetVersion: string,
    @Body() dto: RollbackDocumentVersionDto,
    @Req() req: any,
  ) {
    return this.documentService.rollbackVersion(id, targetVersion, dto.reason, req.user.id);
  }

  @Get(':id/versions/:version/preview')
  @ApiOperation({ summary: '获取历史版本预览信息' })
  async getVersionPreview(
    @Param('id') id: string,
    @Param('version') version: string,
    @Req() req: any,
  ) {
    return this.documentService.getVersionPreview(id, version, req.user.id, req.user.role);
  }

  @Get(':id/versions/:version/download')
  @ApiOperation({ summary: '下载历史版本文件' })
  async downloadVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    return this.documentService.downloadVersion(id, version, req.user.id, req.user.role, res);
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

  @Patch(':id/markdown')
  @ApiOperation({ summary: '更新 Markdown 正文' })
  updateMarkdown(@Param('id') id: string, @Body() dto: UpdateMarkdownDto, @Req() req: any) {
    return this.documentService.updateMarkdown(id, req.user.id, req.user.role, dto);
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

  @Post(':id/confirm-read')
  @ApiOperation({ summary: '确认已阅读文件' })
  confirmRead(@Param('id') id: string, @Req() req: any) {
    return this.lifecycleSvc.confirmRead(id, req.user?.id ?? 'system');
  }

  @Post(':id/revisions')
  @UseGuards(PermissionGuard)
  @CheckPermission('document:revise')
  @ApiOperation({ summary: '发起文件修订草稿' })
  createRevision(@Param('id') id: string, @Req() req: any) {
    return this.documentService.createRevisionDraft(id, req.user.id);
  }
}
