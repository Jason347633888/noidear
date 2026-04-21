import { Module } from '@nestjs/common';
import { MetalDetectionController } from './metal-detection.controller';
import { MetalDetectionService } from './metal-detection.service';

@Module({
  controllers: [MetalDetectionController],
  providers: [MetalDetectionService],
  exports: [MetalDetectionService],
})
export class MetalDetectionModule {}
