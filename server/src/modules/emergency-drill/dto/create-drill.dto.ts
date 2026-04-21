import { IsString, IsOptional, IsInt, IsNumber } from 'class-validator';

export class CreateDrillDto {
  @IsString() drill_type: string;
  @IsString() drill_date: string;
  @IsInt() participants: number;
  @IsString() result: string;
  @IsOptional() @IsNumber() duration_min?: number;
  @IsOptional() @IsString() issues?: string;
  @IsOptional() @IsString() improvement?: string;
  @IsOptional() @IsString() organizer?: string;
}
