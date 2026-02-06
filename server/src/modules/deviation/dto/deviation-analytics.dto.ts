import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export class TrendQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(['day', 'week', 'month'])
  granularity: 'day' | 'week' | 'month';
}

export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
