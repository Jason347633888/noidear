import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SetProductRiskZoneDto {
  @IsString()
  @IsNotEmpty()
  risk_zone: string;

  @IsOptional()
  @IsString()
  basis?: string;

  @IsDateString()
  effective_from: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @IsOptional()
  @IsString()
  approvalInstanceId?: string;
}
