import { IsString, IsOptional } from 'class-validator';

export class CreateCapaDto {
  @IsString() trigger_type: string; // 'non_conformance'|'customer_complaint'|'internal_audit'|'other'
  @IsOptional() @IsString() trigger_id?: string;
  @IsString() description: string;
  @IsOptional() @IsString() root_cause?: string;
  @IsOptional() @IsString() corrective_action?: string;
  @IsOptional() @IsString() preventive_action?: string;
  @IsOptional() @IsString() due_date?: string;
  @IsOptional() @IsString() responsible_id?: string;
}
