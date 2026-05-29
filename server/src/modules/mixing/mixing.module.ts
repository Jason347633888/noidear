import { Module } from '@nestjs/common';
import { MixingController } from './mixing.controller';
import { MixingService } from './mixing.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BatchTraceModule } from '../batch-trace/batch-trace.module';

@Module({
  imports: [PrismaModule, BatchTraceModule],
  controllers: [MixingController],
  providers: [MixingService],
  exports: [MixingService],
})
export class MixingModule {}
