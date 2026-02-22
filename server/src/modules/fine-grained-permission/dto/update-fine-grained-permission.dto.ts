import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PermissionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateFineGrainedPermissionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PermissionStatus)
  @IsOptional()
  status?: PermissionStatus;
}
