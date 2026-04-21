import { IsString, IsOptional } from 'class-validator';

export class CreateViolationDto {
  @IsString() employee_id: string;
  @IsString() violation_type: string;
  @IsString() description: string;
  @IsOptional() @IsString() penalty?: string;
  @IsOptional() @IsString() corrective_requirement?: string;
}
