import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { RectificationService } from './rectification.service';
import { SubmitRectificationDto } from './dto';
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

@ApiTags('Audit Rectification')
@ApiBearerAuth()
@Controller('api/v1/audit/findings')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RectificationController {
  constructor(
    private readonly rectificationService: RectificationService,
    private readonly auditService: AuditService,
  ) {}

  @Get('my-rectifications')
  @CheckPermission('audit-rectification:read')
  @ApiOperation({ summary: 'Get my rectification tasks' })
  @ApiResponse({ status: 200, description: 'Rectification tasks retrieved' })
  async getMyRectifications(@Request() req: AuthenticatedRequest) {
    const results = await this.rectificationService.getMyRectifications(
      req.user.userId,
    );

    await this.logSensitiveOperation(
      req,
      'view_my_rectifications',
      'AuditFinding',
      '',
      'My Rectifications',
      { count: results.length },
    );

    return results;
  }

  @Post(':id/submit-rectification')
  @CheckPermission('audit-rectification:submit')
  @ApiOperation({ summary: 'Submit rectification for verification' })
  @ApiResponse({ status: 200, description: 'Rectification submitted' })
  @ApiResponse({ status: 403, description: 'User not the assignee' })
  @ApiResponse({ status: 404, description: 'Finding or document not found' })
  @ApiResponse({ status: 400, description: 'Invalid status or version mismatch' })
  async submitRectification(
    @Param('id') id: string,
    @Body() submitDto: SubmitRectificationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.rectificationService.submitRectification(
      id,
      submitDto,
      req.user.userId,
    );

    await this.logSensitiveOperation(
      req,
      'submit_rectification',
      'AuditFinding',
      id,
      `Finding ${id}`,
      {
        documentId: submitDto.documentId,
        version: submitDto.version,
      },
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
    } catch (error) {
      console.error('Failed to create sensitive log:', error);
    }
  }
}
