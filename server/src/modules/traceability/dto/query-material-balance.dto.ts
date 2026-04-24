import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryBalanceDto {
  @IsOptional()
  @IsString()
  materialLotId?: string;

  @IsOptional()
  @IsString()
  productionBatchId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(['current', 'asOf'] as const)
  timeMode?: 'current' | 'asOf';

  @IsOptional()
  @IsDateString()
  asOfAt?: string;
}
