import { Module } from '@nestjs/common';
import { IncomingInspectionController } from './incoming-inspection.controller';
import { IncomingInspectionService } from './incoming-inspection.service';

@Module({
  controllers: [IncomingInspectionController],
  providers: [IncomingInspectionService],
  exports: [IncomingInspectionService],
})
export class IncomingInspectionModule {}
