import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProcessInstanceDto {
  @ApiProperty({ description: '流程模板 ID' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiPropertyOptional({ description: '产品名称' })
  @IsString()
  @IsOptional()
  productName?: string;
}
