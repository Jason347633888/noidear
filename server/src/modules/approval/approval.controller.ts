import { Controller, Post, Get, Body, Param, Query, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateApprovalChainDto, ApproveDto } from './dto';
import { StatisticsService } from '../statistics/statistics.service';
import { StatisticsCacheInterceptor } from '../../common/interceptors/statistics-cache.interceptor';

@ApiTags('审批管理')
@ApiBearerAuth()
@Controller('approvals')
@UseGuards(JwtAuthGuard)
@UseInterceptors(StatisticsCacheInterceptor)
export class ApprovalController {
  constructor(
    private readonly approvalService: ApprovalService,
    private readonly statisticsService: StatisticsService,
  ) {}

  @Get('chains/:documentId')
  @ApiOperation({ summary: '获取文档审批链' })
  @ApiParam({ name: 'documentId', description: '文档ID' })
  async getApprovalChain(@Param('documentId') documentId: string) {
    return this.approvalService.getApprovalChain(documentId);
  }

  // ========== New Unified Endpoints ==========

  @Get('pending')
  @ApiOperation({ summary: '获取当前用户的待审批列表' })
  async getPendingApprovals(@Request() req: any) {
    return this.approvalService.getPendingApprovals(req.user.userId);
  }

  @Get('detail/:id')
  @ApiOperation({ summary: '获取审批详情' })
  @ApiParam({ name: 'id', description: '审批ID' })
  async getApprovalDetail(@Param('id') id: string) {
    return this.approvalService.getApprovalDetail(id);
  }

  @Get('history')
  @ApiOperation({ summary: '获取当前用户的审批历史' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getApprovalHistory(
    @Request() req: any,
    @Query() query: { page?: number; limit?: number },
  ) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    return this.approvalService.getApprovalHistory(req.user.userId, page, limit);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '统一审批接口（自动路由到对应审批类型）' })
  @ApiParam({ name: 'id', description: '审批ID' })
  async approveUnified(@Param('id') id: string, @Body() dto: ApproveDto, @Request() req: any) {
    return this.approvalService.approveUnified(
      id,
      req.user.userId,
      dto.action,
      dto.comment || dto.rejectionReason,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: '统一驳回接口' })
  @ApiParam({ name: 'id', description: '审批ID' })
  async rejectUnified(@Param('id') id: string, @Body() dto: ApproveDto, @Request() req: any) {
    return this.approvalService.approveUnified(
      id,
      req.user.userId,
      'rejected',
      dto.rejectionReason || dto.comment,
    );
  }
}
