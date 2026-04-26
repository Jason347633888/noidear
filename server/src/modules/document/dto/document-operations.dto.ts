import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateReadRequirementDto {
  @IsIn(['department', 'role', 'user'])
  scopeType!: string;

  @IsString()
  scopeId!: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class TrainingNeedActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedTrainingProjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ImpactReviewCreateDto {
  @IsIn(['document', 'external_file', 'change_event', 'corrective_action', 'recall', 'traceability'])
  sourceType!: string;

  @IsString()
  sourceId!: string;

  @IsString()
  title!: string;
}

export class ImpactItemUpdateDto {
  @IsOptional()
  @IsIn(['open', 'accepted', 'dismissed', 'done'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CoverageQueryDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}

export class OperationsDaysQueryDto {
  @IsOptional()
  @Type(() => Number)
  days?: number = 30;
}

export class AuditChainQueryDto {
  @IsString()
  sourceType!: string;

  @IsString()
  sourceId!: string;

  @IsOptional()
  @Type(() => Number)
  maxDepth?: number = 4;
}
