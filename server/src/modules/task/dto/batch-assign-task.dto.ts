import { IsString, IsNotEmpty, IsArray, IsDateString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BatchAssignTaskDto {
  @ApiProperty({ description: '模板 ID' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: '部门 ID 列表', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  departmentIds: string[];

  @ApiProperty({ description: '截止日期' })
  @IsDateString()
  deadline: string;
}
