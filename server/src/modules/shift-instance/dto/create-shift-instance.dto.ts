import { IsDateString, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateShiftInstanceDto {
  @ValidateIf((dto) => !dto.shift_type)
  @IsNotEmpty()
  @IsString()
  shiftTypeId?: string;

  @ValidateIf((dto) => !dto.shiftTypeId)
  @IsNotEmpty()
  @IsString()
  shift_type?: string;

  @IsNotEmpty()
  @IsDateString()
  shift_date: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  leaderId?: string;

  @IsOptional()
  @IsString()
  teamOverrideReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseShiftInstanceDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
