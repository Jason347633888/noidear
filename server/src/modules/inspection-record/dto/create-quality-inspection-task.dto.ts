import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export const TASK_TYPES = [
  'water_quality',
  'env_microbiology_sampling',
  'env_microbiology_result',
  'pest_control',
  'hygiene_inspection',
  'vehicle_sanitation',
  'allergen_test',
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const COMPLETED_RESOURCE_TYPES = [
  'inspection_record',
  'environment_record',
  'sanitizer_concentration_check',
] as const;

export type CompletedResourceType = (typeof COMPLETED_RESOURCE_TYPES)[number];

export class CreateQualityInspectionTaskDto {
  // Populated by controller from DEFAULT_COMPANY_ID
  company_id: string;

  @Type(() => Date)
  work_date: Date;

  @IsOptional()
  @IsString()
  shift_type?: string;

  @IsOptional()
  @IsString()
  area_point_id?: string;

  @IsOptional()
  @IsString()
  production_batch_id?: string;

  @IsString()
  @IsNotEmpty()
  task_type: string;

  @IsString()
  @IsNotEmpty()
  target_resource_type: string;

  @IsOptional()
  @IsString()
  target_resource_id?: string;

  @IsOptional()
  @IsString()
  standard_id?: string;

  @IsOptional()
  @IsString()
  assignee_role?: string;

  @IsOptional()
  @IsString()
  assignee_user_id?: string;

  @IsOptional()
  @Type(() => Date)
  due_at?: Date;
}

export class ListWorkbenchTasksDto {
  // Populated by controller
  company_id: string;

  @Type(() => Date)
  work_date: Date;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  task_type?: string;

  @IsOptional()
  @IsString()
  area_point_id?: string;
}

export class CompleteInspectionTaskDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(COMPLETED_RESOURCE_TYPES as unknown as string[])
  completed_resource_type: string;

  @IsString()
  @IsNotEmpty()
  completed_resource_id: string;
}

export class SkipTaskDto {
  @IsOptional()
  @IsString()
  skipped_reason?: string;
}
