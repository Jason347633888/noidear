import { IsNotEmpty, IsString, IsIn, IsOptional, IsArray } from 'class-validator';

export class CreateVerificationDto {
  @IsNotEmpty()
  @IsString()
  verification_method: string;

  @IsNotEmpty()
  @IsIn(['effective', 'ineffective'])
  result: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence_record_ids?: string[];
}
