import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDTO {
  @ApiProperty()
  @IsString() @MinLength(3) username: string;

  @ApiProperty()
  @IsString() @MinLength(8) password: string;

  @ApiProperty()
  @IsString() name: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() departmentId?: string;

  @ApiProperty({ description: '角色 ID' })
  @IsString() roleId: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() superiorId?: string;
}
