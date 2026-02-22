import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request as ExpressRequest } from 'express';
import { ReportService } from './report.service';
import { QueryReportDto } from './dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { CheckPermission } from '../../../common/decorators/permission.decorator';
import { AuditService } from '../../audit/audit.service';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    username: string;
    role: string;
  };
}

@ApiTags('Audit Report')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly auditService: AuditService,
  ) {}

  @Post('plans/:id/complete')
  @CheckPermission('audit-plan:complete')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Complete audit plan and generate report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiResponse({ status: 400, description: 'Completion conditions not met' })
  @ApiResponse({ status: 403, description: 'User not the auditor' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 409, description: 'Report already exists' })
  async completePlan(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.reportService.completePlanAndGenerateReport(
      id,
      req.user.userId,
    );

    await this.logSensitiveOperation(
      req,
      'complete_audit_plan',
      'AuditPlan',
      id,
      `Plan ${id}`,
      { reportId: result.id, documentId: result.documentId },
    );

    return result;
  }

  @Get('reports')
  @CheckPermission('audit-report:read')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Query audit reports' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  async queryReports(
    @Query() query: QueryReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const results = await this.reportService.queryReports(query);

    await this.logSensitiveOperation(
      req,
      'query_audit_reports',
      'AuditReport',
      '',
      'Audit Reports',
      { count: results.length, filters: query },
    );

    return results;
  }

  @Get('reports/:id')
  @CheckPermission('audit-report:read')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Get audit report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReport(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.reportService.getReportById(id);

    await this.logSensitiveOperation(
      req,
      'get_audit_report',
      'AuditReport',
      id,
      `Report ${id}`,
      {},
    );

    return result;
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
    } catch {
      // Silently fail - sensitive logging is best-effort
      // Logging failure should not block the business operation
    }
  }
}
