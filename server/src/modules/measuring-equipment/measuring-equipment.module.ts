import { Module } from '@nestjs/common';
import { MeasuringEquipmentController } from './measuring-equipment.controller';
import { MeasuringEquipmentService } from './measuring-equipment.service';
import { NonConformanceModule } from '../non-conformance/non-conformance.module';

@Module({
  imports: [NonConformanceModule],
  controllers: [MeasuringEquipmentController],
  providers: [MeasuringEquipmentService],
  exports: [MeasuringEquipmentService],
})
export class MeasuringEquipmentModule {}
