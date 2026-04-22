import { Module } from '@nestjs/common';
import { ProductionRunController } from './production-run.controller';
import { ProductionRunService } from './production-run.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductionRunController],
  providers: [ProductionRunService],
  exports: [ProductionRunService],
})
export class ProductionRunModule {}
