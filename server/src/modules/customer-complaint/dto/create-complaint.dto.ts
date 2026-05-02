import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateComplaintDto {
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsString()
  @IsNotEmpty()
  production_batch_id: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  complaint_type?: string;
}

export class ResolveComplaintDto {
  @IsString() resolution: string;
}
