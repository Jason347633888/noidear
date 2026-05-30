import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RetainedSampleService } from './retained-sample.service';
import { RetainedSampleController } from './retained-sample.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RetainedSampleController],
  providers: [RetainedSampleService],
  exports: [RetainedSampleService],
})
export class RetainedSampleModule {}
