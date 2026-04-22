import { IsNotEmpty, IsIn, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateShiftInstanceDto {
  @IsNotEmpty()
  @IsIn(['白班', '夜班'])
  shift_type: string;

  @IsNotEmpty()
  @IsDateString()
  shift_date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseShiftInstanceDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
