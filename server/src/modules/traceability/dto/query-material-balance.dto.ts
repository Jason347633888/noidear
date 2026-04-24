import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryMaterialBalanceDto {
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
}
