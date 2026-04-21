import { IsString, IsOptional } from 'class-validator';

export class CreateChangeEventDto {
  @IsString() title: string;
  @IsString() change_type: string; // 'personnel'|'process'|'equipment'|'formula'|'facility'
  @IsString() description: string;
  @IsOptional() @IsString() risk_level?: string; // 'low'|'medium'|'high'
}
