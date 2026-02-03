import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDTO {
  @ApiProperty({ description: '部门编码' })
  @IsString() code: string;

  @ApiProperty({ description: '部门名称' })
  @IsString() name: string;

  @ApiProperty({ required: false, description: '上级部门ID' })
  @IsOptional() @IsString() parentId?: string;
}
