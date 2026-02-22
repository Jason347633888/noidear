import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateLoginLogDto {
  @ApiPropertyOptional({ description: '用户 ID（登录失败时为 null, BR-270）' })
  @IsString()
  @IsOptional()
  userId?: string | null;

  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: '操作类型',
    enum: ['login', 'logout', 'login_failed'],
  })
  @IsString()
  @IsIn(['login', 'logout', 'login_failed'])
  action: string;

  @ApiProperty({ description: 'IP 地址（必填）' })
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @ApiPropertyOptional({ description: 'User-Agent' })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional({ description: '地理位置' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: '失败原因' })
  @IsString()
  @IsOptional()
  failReason?: string;
}
