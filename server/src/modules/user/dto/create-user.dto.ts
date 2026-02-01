import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
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

  @ApiProperty({ enum: ['user', 'leader', 'admin'] })
  @IsEnum(['user', 'leader', 'admin']) role: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() superiorId?: string;
}
