import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateProductRecallBatchDto {
  @IsString()
  @IsNotEmpty()
  production_batch_id!: string;

  @IsOptional()
  affected_qty?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateProductRecallNotificationDto {
  @IsOptional()
  @IsString()
  external_party_id?: string;

  @IsString()
  @IsNotEmpty()
  customer_name!: string;

  @IsOptional()
  @IsString()
  contact_name?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsEnum(['phone', 'email', 'letter', 'onsite'])
  notification_method?: 'phone' | 'email' | 'letter' | 'onsite';
}

export class CreateProductRecallDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  risk_level?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsString()
  source_complaint_id?: string;

  @IsOptional()
  @IsString()
  source_query_ref?: string;

  @IsOptional()
  @IsString()
  source_traceability_snapshot_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductRecallBatchDto)
  batches?: CreateProductRecallBatchDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductRecallNotificationDto)
  notifications?: CreateProductRecallNotificationDto[];
}
