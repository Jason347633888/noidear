import { Module } from '@nestjs/common';
import { CorrectiveActionController } from './corrective-action.controller';
import { CorrectiveActionService } from './corrective-action.service';

@Module({
  controllers: [CorrectiveActionController],
  providers: [CorrectiveActionService],
  exports: [CorrectiveActionService],
})
export class CorrectiveActionModule {}
