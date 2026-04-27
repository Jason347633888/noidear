import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  DOCUMENT_RELATION_TYPES,
  DOCUMENT_TYPES,
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
