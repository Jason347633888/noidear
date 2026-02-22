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
import { VerificationService } from './verification.service';
import { VerifyRectificationDto, RejectRectificationDto } from './dto';
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

@ApiTags('Audit Verification')
@ApiBearerAuth()
@Controller('audit/findings')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly auditService: AuditService,
  ) {}

  @Get('pending-verification')
  @CheckPermission('audit-verification:read')
  @ApiOperation({ summary: 'Get pending verification list' })
  @ApiResponse({ status: 200, description: 'Pending verifications retrieved' })
  async getPendingVerifications(@Request() req: AuthenticatedRequest) {
    const results = await this.verificationService.getPendingVerifications(
      req.user.userId,
    );

    await this.logSensitiveOperation(
      req,
      'view_pending_verifications',
      'AuditFinding',
      '',
      'Pending Verifications',
      { count: results.length },
    );

    return results;
  }

  @Post(':id/verify')
  @CheckPermission('audit-verification:verify')
  @ApiOperation({ summary: 'Verify rectification (approve)' })
  @ApiResponse({ status: 200, description: 'Rectification verified' })
  @ApiResponse({ status: 403, description: 'User not the auditor' })
  @ApiResponse({ status: 404, description: 'Finding not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid status or no evidence',
  })
  async verifyRectification(
    @Param('id') id: string,
    @Body() verifyDto: VerifyRectificationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.verificationService.verifyRectification(
      id,
      verifyDto,
      req.user.userId,
    );

    await this.logSensitiveOperation(
      req,
      'verify_rectification',
      'AuditFinding',
      id,
      `Finding ${id}`,
      { comment: verifyDto.comment },
    );

    return result;
  }

  @Post(':id/reject')
  @CheckPermission('audit-verification:reject')
  @ApiOperation({ summary: 'Reject rectification' })
  @ApiResponse({ status: 200, description: 'Rectification rejected' })
  @ApiResponse({ status: 403, description: 'User not the auditor' })
  @ApiResponse({ status: 404, description: 'Finding not found' })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  async rejectRectification(
    @Param('id') id: string,
    @Body() rejectDto: RejectRectificationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.verificationService.rejectRectification(
      id,
      rejectDto,
      req.user.userId,
    );

    await this.logSensitiveOperation(
      req,
      'reject_rectification',
      'AuditFinding',
      id,
      `Finding ${id}`,
      { rejectionReason: rejectDto.rejectionReason },
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
