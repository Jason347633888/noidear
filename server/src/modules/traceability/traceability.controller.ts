import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueryTraceabilityDto } from './dto/query-traceability.dto';
import { QueryMaterialBalanceDto } from './dto/query-material-balance.dto';
import { CreateTraceabilityLinkageDto } from './dto/create-traceability-linkage.dto';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityBalanceService } from './traceability-balance.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';

@Controller('traceability')
@UseGuards(JwtAuthGuard)
export class TraceabilityController {
  constructor(
    private readonly queryService: TraceabilityQueryService,
    private readonly balanceService: TraceabilityBalanceService,
    private readonly linkageService: TraceabilityLinkageService,
    private readonly exportService: TraceabilityExportService,
  ) {}

  @Post('query')
  query(@Body() dto: QueryTraceabilityDto, @Req() req: any) {
    return this.queryService.query(dto, req.user);
  }

  @Post('query/graph')
  graph(@Body() dto: QueryTraceabilityDto, @Req() req: any) {
    return this.queryService.query({ ...dto, viewMode: 'graph' }, req.user);
  }

  @Post('balance')
  materialBalance(@Body() dto: QueryMaterialBalanceDto, @Req() req: any) {
    return this.balanceService.analyze(dto, req.user);
  }

  @Post('actions')
  createAction(@Body() dto: CreateTraceabilityLinkageDto, @Req() req: any) {
    return this.linkageService.create(dto, req.user);
  }

  @Post('export')
  export(@Body() dto: CreateTraceabilityExportDto, @Req() req: any) {
    return this.exportService.create(dto, req.user);
  }
}
