import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDepartmentDTO {
  @ApiProperty({ required: false, description: '部门名称' })
  @IsOptional() @IsString() name?: string;

  @ApiProperty({ required: false, description: '上级部门ID' })
  @IsOptional() @IsString() parentId?: string;

  @ApiProperty({ enum: ['active', 'inactive'], required: false, description: '部门状态' })
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
}
