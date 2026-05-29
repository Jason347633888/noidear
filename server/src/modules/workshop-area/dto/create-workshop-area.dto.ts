import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWorkshopAreaDto {
  @IsString() @IsNotEmpty() company_id: string;
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() type: string;
  @IsOptional() @IsString() parentId?: string;
}
