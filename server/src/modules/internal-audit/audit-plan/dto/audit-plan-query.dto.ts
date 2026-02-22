import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AuditPlanQueryDto {
  @IsOptional()
  @IsEnum(['draft', 'ongoing', 'pending_rectification', 'completed'])
  status?: string;

  @IsOptional()
  @IsEnum(['quarterly', 'semiannual', 'annual'])
  type?: string;

  @IsOptional()
  @IsString()
  auditorId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
