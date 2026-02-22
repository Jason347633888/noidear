import { Module } from '@nestjs/common';
import { OperationLogService } from './operation-log.service';
import { OperationLogController } from './operation-log.controller';
import { PermissionAuditLogController } from './permission-audit-log.controller';

@Module({
  controllers: [OperationLogController, PermissionAuditLogController],
  providers: [OperationLogService],
  exports: [OperationLogService],
})
export class OperationLogModule {}
