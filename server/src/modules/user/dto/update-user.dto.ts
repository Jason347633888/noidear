import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDTO {
  @ApiProperty({ required: false })
  @IsOptional() @IsString() name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() departmentId?: string;

  @ApiProperty({ required: false, description: '角色 ID' })
  @IsOptional() @IsString() roleId?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() superiorId?: string;

  @ApiProperty({ enum: ['active', 'inactive'], required: false })
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
}
