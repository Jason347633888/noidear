import { IsString, IsOptional } from 'class-validator';

export class CreateVerificationDto {
  @IsString() change_event_id: string;
  @IsString() verification_date: string; // ISO date string
  @IsString() result: string; // 'pass'|'fail'|'partial'
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() verified_by?: string;
}
