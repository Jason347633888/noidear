import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecycleBinQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class BatchOperationDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
