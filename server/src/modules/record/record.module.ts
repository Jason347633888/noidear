import { Module } from '@nestjs/common';
import { RecordController } from './record.controller';
import { RecordService } from './record.service';
import { ChangeLogInterceptor } from './interceptors/change-log.interceptor';
import { PrismaModule } from '../../prisma/prisma.module';
import { DynamicFormBatchController } from './controllers/dynamic-form-batch.controller';
import { DynamicFormBatchService } from './services/dynamic-form-batch.service';

@Module({
  imports: [PrismaModule],
  controllers: [RecordController, DynamicFormBatchController],
  providers: [RecordService, ChangeLogInterceptor, DynamicFormBatchService],
  exports: [RecordService, DynamicFormBatchService],
})
export class RecordModule {}
