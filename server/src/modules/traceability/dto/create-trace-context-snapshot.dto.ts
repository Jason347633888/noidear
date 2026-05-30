import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_TRACE_DEPTH, SUPPORTED_ROOT_TYPES, type RootObjectType } from '../evidence-snapshot.helpers';

/**
 * Task 9 + Task 14-3: request to build a bounded trace-context snapshot.
 * Supports rootObjectType: production_batch, material_batch, product_recall, traceability_drill.
 */
export class CreateTraceContextSnapshotDto {
  @IsString()
  @IsIn(SUPPORTED_ROOT_TYPES)
  rootObjectType!: RootObjectType;

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
