import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDTO {
  @ApiProperty({ required: false })
  @IsOptional() @IsString() name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() departmentId?: string;

  @ApiProperty({ required: false, description: '角色 ID（新口径，优先使用）' })
  @IsOptional() @IsString() roleId?: string;

  @ApiProperty({ enum: ['user', 'leader', 'admin'], required: false, description: '角色代码（旧口径，兼容保留）' })
  @IsOptional() @IsEnum(['user', 'leader', 'admin']) role?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() superiorId?: string;

  @ApiProperty({ enum: ['active', 'inactive'], required: false })
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
}
