import { IsString, IsOptional } from 'class-validator';

export class CreateComplaintDto {
  @IsString() customer_name: string;
  @IsOptional() @IsString() production_batch_id?: string;
  @IsString() description: string;
  @IsOptional() @IsString() complaint_type?: string;
}

export class ResolveComplaintDto {
  @IsString() resolution: string;
}
