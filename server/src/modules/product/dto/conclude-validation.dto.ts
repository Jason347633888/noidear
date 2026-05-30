import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConcludeValidationDto {
  @IsString()
  @IsNotEmpty()
  conclusion: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  conclusion_by?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  approvalInstanceId?: string;
}
