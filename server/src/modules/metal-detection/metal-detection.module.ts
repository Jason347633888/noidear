import { Module } from '@nestjs/common';
import { MetalDetectionController } from './metal-detection.controller';
import { MetalDetectionService } from './metal-detection.service';
import { NonConformanceModule } from '../non-conformance/non-conformance.module';

@Module({
  imports: [NonConformanceModule],
  controllers: [MetalDetectionController],
  providers: [MetalDetectionService],
  exports: [MetalDetectionService],
})
export class MetalDetectionModule {}
