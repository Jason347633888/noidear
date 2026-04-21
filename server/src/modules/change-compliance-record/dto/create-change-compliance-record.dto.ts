import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateChangeComplianceRecordDto {
  @IsString() change_event_id: string;
  @IsOptional() @IsString() assessor_id?: string;
  @IsOptional() @IsBoolean() legal_compliance?: boolean;
  @IsOptional() @IsString() safety_impact?: string;
  @IsOptional() @IsString() risk_level?: string; // low, medium, high
  @IsOptional() @IsString() conclusion?: string;
  @IsOptional() @IsString() notes?: string;
}
