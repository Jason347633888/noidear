import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ description: '原图 URL' })
  originalUrl: string;

  @ApiProperty({ description: '缩略图 URL' })
  thumbnailUrl: string;

  @ApiProperty({ description: '原始文件名' })
  fileName: string;

  @ApiProperty({ description: '文件大小（字节）' })
  fileSize: number;

  @ApiProperty({ description: 'MIME 类型' })
  mimeType: string;
}

export class BatchUploadResponseDto {
  @ApiProperty({ description: '上传结果列表', type: [UploadResponseDto] })
  files: UploadResponseDto[];

  @ApiProperty({ description: '成功数量' })
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  failedCount: number;
}
