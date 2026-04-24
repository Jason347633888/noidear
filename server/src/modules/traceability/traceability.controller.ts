import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueryTraceabilityDto } from './dto/query-traceability.dto';
import { QueryBalanceDto } from './dto/query-material-balance.dto';
import { CreateTraceabilityActionDto } from './dto/create-traceability-linkage.dto';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';
import { CreateTraceabilitySnapshotDto } from './dto/create-traceability-snapshot.dto';
import { TraceabilityService } from './traceability.service';

@Controller('traceability')
@UseGuards(JwtAuthGuard)
export class TraceabilityController {
  constructor(private readonly service: TraceabilityService) {}

  @Post('query')
  query(@Body() dto: QueryTraceabilityDto, @Req() req: any) {
    return this.service.query(dto, req.user);
  }

  @Post('query/graph')
  graph(@Body() dto: QueryTraceabilityDto, @Req() req: any) {
    return this.service.query({ ...dto, viewMode: 'graph' }, req.user);
  }

  @Post('balance')
  balance(@Body() dto: QueryBalanceDto, @Req() req: any) {
    return this.service.balance(dto, req.user);
  }

  @Post('actions')
  createAction(@Body() dto: CreateTraceabilityActionDto, @Req() req: any) {
    return this.service.createAction(dto, req.user);
  }

  @Post('export')
  createExport(@Body() dto: CreateTraceabilityExportDto, @Req() req: any) {
    return this.service.createExport(dto, req.user);
  }

  @Post('snapshots')
  createSnapshot(@Body() dto: CreateTraceabilitySnapshotDto, @Req() req: any) {
    return this.service.createSnapshot(dto, req.user);
  }

  @Get('snapshots/:snapshotId')
  getSnapshot(@Param('snapshotId') snapshotId: string) {
    return this.service.getSnapshot(snapshotId);
  }

  @Get('snapshots/:snapshotId/result')
  getSnapshotResult(@Param('snapshotId') snapshotId: string) {
    return this.service.getSnapshotResult(snapshotId);
  }
}
