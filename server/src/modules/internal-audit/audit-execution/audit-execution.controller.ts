import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditExecutionService } from './audit-execution.service';
import { CreateAuditFindingDto, UpdateAuditFindingDto } from './dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { CheckPermission } from '../../../common/decorators/permission.decorator';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedRequest } from './audit-execution.types';

@ApiTags('Audit Execution')
@ApiBearerAuth()
@Controller('api/v1/audit')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditExecutionController {
  constructor(
    private readonly auditExecutionService: AuditExecutionService,
    private readonly auditService: AuditService,
  ) {}

  @Post('findings')
  @CheckPermission('audit-finding:create')
  @ApiOperation({ summary: 'Record audit finding' })
  @ApiResponse({ status: 201, description: 'Finding created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'User not the auditor' })
  @ApiResponse({ status: 404, description: 'Plan or document not found' })
  async create(@Body() createDto: CreateAuditFindingDto, @Request() req: AuthenticatedRequest) {
    const result = await this.auditExecutionService.create(
      createDto,
      req.user.userId,
    );

    const details = {
      planId: createDto.planId,
      documentId: createDto.documentId,
      auditResult: createDto.auditResult,
    };

    await this.logSensitiveOperation(
      req,
      'create_audit_finding',
      'AuditFinding',
      result.id,
      `${createDto.documentId} - ${createDto.auditResult}`,
      details,
    );

    return result;
  }

  @Put('findings/:id')
  @CheckPermission('audit-finding:update')
  @ApiOperation({ summary: 'Update audit finding' })
  @ApiResponse({ status: 200, description: 'Finding updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'User not the auditor' })
  @ApiResponse({ status: 404, description: 'Finding not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAuditFindingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.auditExecutionService.update(
      id,
      updateDto,
      req.user.userId,
    );

    await this.logSensitiveOperation(
      req,
      'update_audit_finding',
      'AuditFinding',
      id,
      `Finding ${id}`,
      {
        auditResult: updateDto.auditResult,
        issueType: updateDto.issueType,
        description: updateDto.description,
        department: updateDto.department,
        assigneeId: updateDto.assigneeId,
      },
    );

    return result;
  }

  // REMOVED: Duplicate route - use ReportController.completePlan() instead
  // This endpoint was redundant with POST /api/v1/audit/plans/:id/complete in report.controller.ts

  @Get('plans/:id/progress')
  @CheckPermission('audit-plan:read')
  @ApiOperation({ summary: 'Get audit execution progress' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getProgress(@Param('id') id: string) {
    return this.auditExecutionService.getProgress(id);
  }

  private async logSensitiveOperation(
    req: AuthenticatedRequest,
    action: string,
    resourceType: string,
    resourceId: string,
    resourceName: string,
    details: Record<string, unknown>,
  ) {
    try {
      await this.auditService.createSensitiveLog({
        userId: req.user.userId,
        username: req.user.username,
        action,
        resourceType,
        resourceId,
        resourceName,
        details,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
    } catch (error) {
      // Log the error but don't fail the main operation
      console.error('Failed to create sensitive log:', error);
    }
  }
}
