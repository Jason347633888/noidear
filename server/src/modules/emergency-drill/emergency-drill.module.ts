import { Module } from '@nestjs/common';
import { EmergencyDrillController } from './emergency-drill.controller';
import { EmergencyDrillService } from './emergency-drill.service';

@Module({
  controllers: [EmergencyDrillController],
  providers: [EmergencyDrillService],
  exports: [EmergencyDrillService],
})
export class EmergencyDrillModule {}
