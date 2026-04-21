import { IsString, IsOptional } from 'class-validator';

export class CreateVisitorDto {
  @IsString() visitor_name: string;
  @IsString() purpose: string;
  @IsString() visit_date: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() escort?: string;
  @IsOptional() @IsString() health_status?: string;
  @IsOptional() @IsString() notes?: string;
}
