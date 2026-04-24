import { Module } from '@nestjs/common';
import { ModelLandingController } from './model-landing.controller';
import { ModelLandingService } from './model-landing.service';

@Module({
  controllers: [ModelLandingController],
  providers: [ModelLandingService],
  exports: [ModelLandingService],
})
export class ModelLandingModule {}
