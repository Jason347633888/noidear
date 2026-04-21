import { Module } from '@nestjs/common';
import { FragileItemInspectionController } from './fragile-item-inspection.controller';
import { FragileItemInspectionService } from './fragile-item-inspection.service';

@Module({
  controllers: [FragileItemInspectionController],
  providers: [FragileItemInspectionService],
  exports: [FragileItemInspectionService],
})
export class FragileItemInspectionModule {}
