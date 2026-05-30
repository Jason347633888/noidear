import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RetainedSampleService } from './retained-sample.service';
import { RetainedSampleController } from './retained-sample.controller';
import { ShelfLifeService } from './shelf-life.service';
import { ShelfLifeController } from './shelf-life.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RetainedSampleController, ShelfLifeController],
  providers: [RetainedSampleService, ShelfLifeService],
  exports: [RetainedSampleService, ShelfLifeService],
})
export class RetainedSampleModule {}
