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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditPlanService } from './audit-plan.service';
import {
  CreateAuditPlanDto,
  UpdateAuditPlanDto,
  AuditPlanQueryDto,
} from './dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { CheckPermission } from '../../../common/decorators/permission.decorator';
import { AuditService } from '../../audit/audit.service';

@ApiTags('Audit Plans')
@ApiBearerAuth()
@Controller('api/v1/audit/plans')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditPlanController {
  constructor(
    private readonly auditPlanService: AuditPlanService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @CheckPermission('audit-plan:create')
  @ApiOperation({ summary: 'Create audit plan' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  async create(@Body() createDto: CreateAuditPlanDto, @Request() req: any) {
    const result = await this.auditPlanService.create(createDto, req.user.userId);
    await this.auditService.createSensitiveLog({
      userId: req.user.userId,
      username: req.user.username,
      action: 'create_audit_plan',
      resourceType: 'AuditPlan',
      resourceId: result.id,
      resourceName: result.title,
      details: { type: result.type, documentCount: createDto.documentIds.length },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    return result;
  }

  @Get()
  @CheckPermission('audit-plan:read')
  @ApiOperation({ summary: 'Get all audit plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async findAll(@Query() query: AuditPlanQueryDto) {
    return this.auditPlanService.findAll(query);
  }

  @Get('statistics')
  @CheckPermission('audit-plan:read')
  @ApiOperation({ summary: 'Get audit plan statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics() {
    return this.auditPlanService.getStatistics();
  }

  @Get(':id')
  @CheckPermission('audit-plan:read')
  @ApiOperation({ summary: 'Get audit plan by ID' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.auditPlanService.findOne(id);
  }

  @Put(':id')
  @CheckPermission('audit-plan:update')
  @ApiOperation({ summary: 'Update audit plan' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAuditPlanDto,
    @Request() req: any,
  ) {
    const result = await this.auditPlanService.update(id, updateDto);
    await this.auditService.createSensitiveLog({
      userId: req.user.userId,
      username: req.user.username,
      action: 'update_audit_plan',
      resourceType: 'AuditPlan',
      resourceId: id,
      resourceName: result.title,
      details: updateDto,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    return result;
  }

  @Delete(':id')
  @CheckPermission('audit-plan:delete')
  @ApiOperation({ summary: 'Delete audit plan' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const result = await this.auditPlanService.remove(id);
    await this.auditService.createSensitiveLog({
      userId: req.user.userId,
      username: req.user.username,
      action: 'delete_audit_plan',
      resourceType: 'AuditPlan',
      resourceId: id,
      resourceName: result.title,
      details: { deletedAt: new Date() },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    return result;
  }

  @Post(':id/start')
  @CheckPermission('audit-plan:execute')
  @ApiOperation({ summary: 'Start audit plan execution' })
  @ApiResponse({ status: 200, description: 'Plan execution started' })
  async start(@Param('id') id: string, @Request() req: any) {
    const result = await this.auditPlanService.execute(id);
    await this.auditService.createSensitiveLog({
      userId: req.user.userId,
      username: req.user.username,
      action: 'start_audit_plan',
      resourceType: 'AuditPlan',
      resourceId: id,
      resourceName: result.title,
      details: { startedAt: result.startedAt },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    return result;
  }

  @Post(':id/copy')
  @CheckPermission('audit-plan:create')
  @ApiOperation({ summary: 'Copy historical audit plan' })
  @ApiResponse({ status: 201, description: 'Plan copied successfully' })
  @ApiResponse({ status: 404, description: 'Original plan not found' })
  async copyPlan(@Param('id') id: string, @Request() req: any) {
    const result = await this.auditPlanService.copyPlan(id, req.user.userId);
    await this.auditService.createSensitiveLog({
      userId: req.user.userId,
      username: req.user.username,
      action: 'copy_audit_plan',
      resourceType: 'AuditPlan',
      resourceId: result.id,
      resourceName: result.title,
      details: { originalPlanId: id },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    return result;
  }
}
