import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateEquipmentDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serial_no?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsInt() calibration_cycle_days?: number;
}
