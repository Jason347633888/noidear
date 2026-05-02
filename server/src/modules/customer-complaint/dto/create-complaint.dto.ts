import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateComplaintDto {
  @IsString() customer_name: string;
  @IsString()
  @IsNotEmpty()
  production_batch_id: string;
  @IsString() description: string;
  @IsOptional() @IsString() complaint_type?: string;
}

export class ResolveComplaintDto {
  @IsString() resolution: string;
}
