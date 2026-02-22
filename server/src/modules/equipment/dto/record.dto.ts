import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecordDto {
  @IsString()
  @IsNotEmpty()
  equipmentId: string;

  @IsString()
  @IsOptional()
  planId?: string;

  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly', 'annual'])
  @IsNotEmpty()
  maintenanceLevel: string;

  @IsDateString()
  @IsNotEmpty()
  maintenanceDate: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  beforeStatus?: string;

  @IsString()
  @IsOptional()
  afterStatus?: string;

  @IsArray()
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  performerSignature?: string;

  @IsString()
  @IsOptional()
  performerId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cost?: number;
}

export class UpdateRecordDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  beforeStatus?: string;

  @IsString()
  @IsOptional()
  afterStatus?: string;

  @IsArray()
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  performerSignature?: string;

  @IsString()
  @IsOptional()
  performerId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cost?: number;
}

export class ApproveRecordDto {
  @IsString()
  @IsOptional()
  reviewerSignature?: string;

  @IsString()
  @IsOptional()
  reviewerId?: string;
}

export class RejectRecordDto {
  @IsString()
  @IsNotEmpty()
  rejectReason: string;

  @IsString()
  @IsOptional()
  reviewerId?: string;
}

export class QueryRecordDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  equipmentId?: string;

  @IsString()
  @IsOptional()
  maintenanceLevel?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  performerId?: string;
}
