import { Module } from '@nestjs/common';
import { WorkshopAreaController } from './workshop-area.controller';
import { WorkshopAreaService } from './workshop-area.service';

@Module({
  controllers: [WorkshopAreaController],
  providers: [WorkshopAreaService],
  exports: [WorkshopAreaService],
})
export class WorkshopAreaModule {}
