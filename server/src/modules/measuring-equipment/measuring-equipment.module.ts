import { Module } from '@nestjs/common';
import { MeasuringEquipmentController } from './measuring-equipment.controller';
import { MeasuringEquipmentService } from './measuring-equipment.service';

@Module({
  controllers: [MeasuringEquipmentController],
  providers: [MeasuringEquipmentService],
  exports: [MeasuringEquipmentService],
})
export class MeasuringEquipmentModule {}
