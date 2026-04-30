import { IsString, IsNotEmpty, IsBoolean, IsOptional, Matches, IsDateString } from 'class-validator';

export class CreateShiftTypeDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) endTime!: string;
  @IsBoolean() crossesDay!: boolean;
}

export class CreateTeamDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
}

export class CreateTeamScheduleDto {
  @IsString() @IsNotEmpty() teamId!: string;
  @IsString() @IsNotEmpty() shiftTypeId!: string;
  @IsDateString() workDate!: string;
}
