import { Module } from '@nestjs/common';
import { StorageService } from '../../common/services';
import { DocumentModule } from '../document/document.module';
import { IncomingInspectionController } from './incoming-inspection.controller';
import { IncomingInspectionService } from './incoming-inspection.service';

@Module({
  imports: [DocumentModule],
  controllers: [IncomingInspectionController],
  providers: [IncomingInspectionService, StorageService],
  exports: [IncomingInspectionService],
})
export class IncomingInspectionModule {}
