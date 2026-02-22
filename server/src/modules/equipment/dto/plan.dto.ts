import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  equipmentId: string;

  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly', 'annual'])
  @IsNotEmpty()
  maintenanceLevel: string;

  @IsDateString()
  @IsNotEmpty()
  plannedDate: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  responsiblePerson?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  reminderDays?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class QueryPlanDto {
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

  @IsString()
  @IsOptional()
  responsiblePerson?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class CalendarQueryDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  year: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Type(() => Number)
  month: number;

  @IsString()
  @IsOptional()
  equipmentId?: string;
}
