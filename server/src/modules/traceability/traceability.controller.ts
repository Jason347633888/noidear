import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueryTraceabilityDto } from './dto/query-traceability.dto';
import { QueryBalanceDto } from './dto/query-material-balance.dto';
import { CreateTraceabilityActionDto } from './dto/create-traceability-linkage.dto';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';
import { CreateTraceabilitySnapshotDto } from './dto/create-traceability-snapshot.dto';
import {
  CreateTraceContextSnapshotDto,
  ExportFromSnapshotDto,
} from './dto/create-trace-context-snapshot.dto';
import { TraceabilityService } from './traceability.service';

const COMPANY_ID = '1';

@ModuleKey('traceability_batch')
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
  getSnapshot(@Param('snapshotId') snapshotId: string, @Req() req: any) {
    return this.service.getSnapshot(snapshotId, req.user);
  }

  @Get('snapshots/:snapshotId/result')
  getSnapshotResult(@Param('snapshotId') snapshotId: string, @Req() req: any) {
    return this.service.getSnapshotResult(snapshotId, req.user);
  }

  // ── Task 9: bounded trace-context snapshot + evidence export ──────────────

  // Always creates a fresh trace-context snapshot (+ EvidenceExport when ready).
  // Rejects any rootObjectType other than production_batch.
  @Post('trace-snapshots')
  createTraceContextSnapshot(@Body() dto: CreateTraceContextSnapshotDto, @Req() req: any) {
    return this.service.createTraceContextSnapshot({
      ...dto,
      company_id: req.user?.companyId ?? COMPANY_ID,
      requesterId: req.user?.id,
    });
  }

  // One-click export: builds a fresh snapshot and (when ready) an EvidenceExport.
  @Post('production-batches/:id/evidence-export')
  exportProductionBatchEvidence(
    @Param('id') id: string,
    @Body() dto: CreateTraceContextSnapshotDto,
    @Req() req: any,
  ) {
    return this.service.createTraceContextSnapshot({
      maxDepth: dto?.maxDepth,
      rootObjectType: 'production_batch',
      rootObjectId: id,
      company_id: req.user?.companyId ?? COMPANY_ID,
      requesterId: req.user?.id,
    });
  }

  // Preview: same fresh-snapshot path; preview snapshots never create an EvidenceExport.
  @Post('production-batches/:id/trace-preview')
  previewProductionBatchTrace(
    @Param('id') id: string,
    @Body() dto: CreateTraceContextSnapshotDto,
    @Req() req: any,
  ) {
    return this.service.createTraceContextSnapshot({
      maxDepth: dto?.maxDepth,
      rootObjectType: 'production_batch',
      rootObjectId: id,
      company_id: req.user?.companyId ?? COMPANY_ID,
      requesterId: req.user?.id,
    });
  }

  // Advanced page: create an EvidenceExport from an existing complete snapshot.
  @Post('snapshots/:snapshotId/export')
  exportFromSnapshot(
    @Param('snapshotId') snapshotId: string,
    @Body() dto: ExportFromSnapshotDto,
    @Req() req: any,
  ) {
    return this.service.exportFromExistingSnapshot(snapshotId, {
      companyId: req.user?.companyId ?? COMPANY_ID,
      requesterId: req.user?.id,
      templateVersion: dto?.templateVersion,
    });
  }

  // Re-download an existing EvidenceExport WITHOUT recomputing or overwriting it.
  @Get('evidence-exports/:exportId/download')
  downloadEvidenceExport(@Param('exportId') exportId: string, @Req() req: any) {
    return this.service.downloadEvidenceExport(exportId, {
      companyId: req.user?.companyId ?? COMPANY_ID,
    });
  }
}
