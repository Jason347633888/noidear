import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateApprovalChainDto, ApproveDto } from './dto';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Post('chains')
  async createApprovalChain(@Body() dto: CreateApprovalChainDto, @Request() req: any) {
    return this.approvalService.createApprovalChain(dto.recordId, req.user.userId);
  }

  @Post('level1/:id/approve')
  async approveLevel1(@Param('id') id: string, @Body() dto: ApproveDto, @Request() req: any) {
    return this.approvalService.approveLevel1(
      id,
      req.user.userId,
      dto.action,
      dto.comment || dto.rejectionReason,
    );
  }

  @Post('level2/:id/approve')
  async approveLevel2(@Param('id') id: string, @Body() dto: ApproveDto, @Request() req: any) {
    return this.approvalService.approveLevel2(
      id,
      req.user.userId,
      dto.action,
      dto.comment || dto.rejectionReason,
    );
  }

  @Get('chains/:recordId')
  async getApprovalChain(@Param('recordId') recordId: string) {
    return this.approvalService.getApprovalChain(recordId);
  }
}
