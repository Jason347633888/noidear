import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateMedicationDto {
  @IsString() employee_id: string;
  @IsString() drug_name: string;
  @IsBoolean() fit_for_duty: boolean;
  @IsOptional() @IsString() dosage?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() health_impact?: string;
  @IsOptional() @IsString() assessed_by?: string;
}
