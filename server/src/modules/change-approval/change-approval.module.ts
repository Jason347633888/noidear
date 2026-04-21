import { Module } from '@nestjs/common';
import { ChangeApprovalController } from './change-approval.controller';
import { ChangeApprovalService } from './change-approval.service';

@Module({
  controllers: [ChangeApprovalController],
  providers: [ChangeApprovalService],
  exports: [ChangeApprovalService],
})
export class ChangeApprovalModule {}
