import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DOCUMENT_RELATION_TYPES,
  DOCUMENT_TYPES,
  FIELD_COVERAGE_STATUSES,
  LANDING_CONFIRMATION_STATUSES,
  LANDING_STATUSES,
  NUMBER_RULE_SCOPES,
  REFERENCE_TARGET_TYPES,
  SOURCE_FOLDERS,
} from '../constants/document-control.constants';

export class DocumentControlMetadataDto {
  @ApiPropertyOptional({ enum: DOCUMENT_TYPES })
  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  documentType?: string;

  @ApiPropertyOptional({ enum: SOURCE_FOLDERS })
  @IsOptional()
  @IsIn(SOURCE_FOLDERS)
  sourceFolder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerDepartment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerDepartmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  externalExpiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lineageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewDueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  contentMd?: string;
}

export class CreateGenericDocumentReferenceDto {
  @ApiPropertyOptional({ enum: REFERENCE_TARGET_TYPES })
  @IsIn(REFERENCE_TARGET_TYPES)
  targetType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetDocId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetRoute?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetLabel?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_RELATION_TYPES })
  @IsIn(DOCUMENT_RELATION_TYPES)
  relationType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;
}

export class UpdateRecordFormLandingEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetModule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetRoute?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetTemplateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landingStrategy?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedDocIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class WorkbenchQueryDto {
  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  days?: number = 30;
}

export const WORKBENCH_ISSUE_TYPES = [
  'pendingReview',
  'dueForReview',
  'expiringExternalFiles',
  'obsoleteReferences',
  'brokenReferences',
  'missingLandingTargets',
  'unconfirmedLandingTargets',
  'partialFieldCoverage',
  'unimplementedRecordReferences',
  'missingMetadata',
  'trainingNeeds',
  'openImpactItems',
] as const;

export type WorkbenchIssueType = typeof WORKBENCH_ISSUE_TYPES[number];

export class WorkbenchIssueQueryDto {
  @ApiProperty({ enum: WORKBENCH_ISSUE_TYPES })
  @IsIn(WORKBENCH_ISSUE_TYPES)
  type!: WorkbenchIssueType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  days?: number = 30;
}

export interface WorkbenchIssueItem {
  id: string;
  issueType: WorkbenchIssueType;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  sourceRoute: string;
  actionLabel: string;
  actionRoute: string;
  detectedAt: Date | string | null;
}

export interface WorkbenchIssueListResponse {
  type: WorkbenchIssueType;
  items: WorkbenchIssueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UpsertNumberRuleDto {
  @IsIn(NUMBER_RULE_SCOPES)
  scope!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  level!: number;

  @IsString()
  departmentId!: string;

  @IsOptional()
  @IsString()
  sourceFolder?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  categoryCode?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @Type(() => Number)
  sequencePadding?: number;

  @IsOptional()
  @IsString()
  separator?: string;

  @IsOptional()
  @IsString()
  resetPolicy?: string;
}

export class BatchConfirmRecordFormLandingDto {
  @IsArray()
  @IsString({ each: true })
  codes!: string[];
}

export class ConfirmRecordFormLandingDto extends UpdateRecordFormLandingEntryDto {
  @IsIn(LANDING_STATUSES)
  landingStatus!: string;

  @IsOptional()
  @IsIn(LANDING_CONFIRMATION_STATUSES)
  confirmationStatus?: string;

  @IsOptional()
  @IsString()
  confidence?: string;

  @IsOptional()
  @IsIn(FIELD_COVERAGE_STATUSES)
  fieldCoverageStatus?: string;

  @IsOptional()
  @IsObject()
  fieldCoverageSummary?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryRoute?: string;
}
