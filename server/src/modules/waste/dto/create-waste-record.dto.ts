import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateWasteRecordDto {
  @IsString() waste_type: string;
  @IsNumber() qty: number;
  @IsString() unit: string;
  @IsString() recorded_at: string;
  @IsOptional() @IsString() production_batch_id?: string;
  @IsOptional() @IsString() shift?: string;
  @IsOptional() @IsString() disposal_destination?: string;
  @IsOptional() @IsString() operator_id?: string;
}
