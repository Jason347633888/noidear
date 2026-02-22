import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionCategory, PermissionScope } from './create-fine-grained-permission.dto';
import { PermissionStatus } from './update-fine-grained-permission.dto';

export class QueryFineGrainedPermissionDto {
  @IsEnum(PermissionCategory)
  @IsOptional()
  category?: PermissionCategory;

  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;

  @IsEnum(PermissionStatus)
  @IsOptional()
  status?: PermissionStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
