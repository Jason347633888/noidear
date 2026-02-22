import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsObject, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncSubmissionItemDto {
  @ApiProperty({ description: '表单模板 ID' })
  @IsString()
  @IsNotEmpty()
  formId: string;

  @ApiProperty({ description: '表单数据' })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, unknown>;

  @ApiProperty({ description: '客户端生成的 UUID（去重）' })
  @IsUUID()
  @IsNotEmpty()
  uuid: string;
}

export class BatchSyncDto {
  @ApiProperty({ description: '批量提交的表单记录', type: [SyncSubmissionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncSubmissionItemDto)
  submissions: SyncSubmissionItemDto[];
}

export class SyncResultItemDto {
  @ApiProperty({ description: 'UUID' })
  uuid: string;

  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '错误信息', required: false })
  error?: string;
}

export class BatchSyncResponseDto {
  @ApiProperty({ description: '同步结果', type: [SyncResultItemDto] })
  results: SyncResultItemDto[];

  @ApiProperty({ description: '成功数量' })
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  failedCount: number;
}

export class SyncStatusResponseDto {
  @ApiProperty({ description: '待同步数量' })
  pendingCount: number;

  @ApiProperty({ description: '最后同步时间', required: false })
  lastSyncTime: Date | null;
}
