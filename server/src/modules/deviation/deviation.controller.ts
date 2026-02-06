import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DeviationService, DeviationReportQueryDto } from './deviation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('deviation-reports')
@UseGuards(JwtAuthGuard)
export class DeviationController {
  constructor(private readonly deviationService: DeviationService) {}

  @Get()
  async findAll(@Query() query: DeviationReportQueryDto) {
    return this.deviationService.findDeviationReports(query);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; comment?: string },
    @Request() req: any,
  ) {
    return this.deviationService.approveDeviationReport(
      id,
      req.user.id,
      body.status,
      body.comment,
    );
  }
}
