import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRecallFromSnapshotDto {
  @IsString()
  @IsNotEmpty()
  traceabilitySnapshotId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
}
