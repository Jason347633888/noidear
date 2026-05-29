import { Module } from '@nestjs/common';
import { ProductionPlanController } from './production-plan.controller';
import { ProductionPlanService } from './production-plan.service';

@Module({
  controllers: [ProductionPlanController],
  providers: [ProductionPlanService],
  exports: [ProductionPlanService],
})
export class ProductionPlanModule {}
