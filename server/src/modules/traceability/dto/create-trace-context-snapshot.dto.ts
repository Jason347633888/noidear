import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_TRACE_DEPTH } from '../evidence-snapshot.helpers';

/**
 * Task 9: request to build a bounded trace-context snapshot.
 * First release accepts exactly one root type: production_batch.
 */
export class CreateTraceContextSnapshotDto {
  @IsString()
  @IsIn(['production_batch'])
  rootObjectType!: 'production_batch';

  @IsString()
  rootObjectId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_TRACE_DEPTH)
  maxDepth?: number;
}

/**
 * Task 9: export an EvidenceExport from an existing complete snapshot
 * (advanced page). No body fields required beyond the snapshot id (route param).
 */
export class ExportFromSnapshotDto {
  @IsOptional()
  @IsString()
  templateVersion?: string;
}
