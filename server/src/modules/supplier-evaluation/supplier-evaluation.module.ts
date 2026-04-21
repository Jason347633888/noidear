import { Module } from '@nestjs/common';
import { SupplierEvaluationController } from './supplier-evaluation.controller';
import { SupplierEvaluationService } from './supplier-evaluation.service';

@Module({
  controllers: [SupplierEvaluationController],
  providers: [SupplierEvaluationService],
  exports: [SupplierEvaluationService],
})
export class SupplierEvaluationModule {}
