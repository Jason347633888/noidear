import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BackupType {
  POSTGRES = 'postgres',
  MINIO = 'minio',
  ALL = 'all',
}

export class TriggerBackupDto {
  @ApiProperty({ description: '备份类型', enum: BackupType })
  @IsEnum(BackupType)
  backupType: BackupType;
}
