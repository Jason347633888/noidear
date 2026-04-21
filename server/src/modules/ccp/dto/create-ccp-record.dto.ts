import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateCcpRecordDto {
  @IsString() production_batch_id: string;
  @IsString() ccp_point_id: string;
  @IsOptional() @IsNumber() measured_value?: number;
  @IsOptional() @IsString() measured_text?: string;
  @IsOptional() @IsString() unit?: string;
  @IsBoolean() is_within_cl: boolean;
  @IsOptional() @IsString() deviation_action?: string;
}
