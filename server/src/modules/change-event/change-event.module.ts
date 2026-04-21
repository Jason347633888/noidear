import { Module } from '@nestjs/common';
import { ChangeEventController } from './change-event.controller';
import { ChangeEventService } from './change-event.service';

@Module({
  controllers: [ChangeEventController],
  providers: [ChangeEventService],
  exports: [ChangeEventService],
})
export class ChangeEventModule {}
