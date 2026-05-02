import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export const CAPA_TRIGGER_TYPES = [
  'non_conformance',
  'customer_complaint',
  'internal_audit',
  'other',
] as const;

export type CapaTriggerType = (typeof CAPA_TRIGGER_TYPES)[number];

export class CreateCapaDto {
  @IsIn(CAPA_TRIGGER_TYPES)
  trigger_type: CapaTriggerType;

  @ValidateIf((dto: CreateCapaDto) => dto.trigger_type !== 'other' || dto.trigger_id !== undefined)
  @IsString()
  @IsNotEmpty()
  trigger_id?: string;

  @IsString() description: string;
  @IsOptional() @IsString() root_cause?: string;
  @IsOptional() @IsString() corrective_action?: string;
  @IsOptional() @IsString() preventive_action?: string;
  @IsOptional() @IsString() due_date?: string;
  @IsOptional() @IsString() responsible_id?: string;
}
