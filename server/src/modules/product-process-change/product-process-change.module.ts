import { forwardRef, Module } from '@nestjs/common';
import { ChangeEventModule } from '../change-event/change-event.module';
import { ProductProcessChangeController } from './product-process-change.controller';
import { ProductProcessChangeService } from './product-process-change.service';

@Module({
  imports: [forwardRef(() => ChangeEventModule)],
  controllers: [ProductProcessChangeController],
  providers: [ProductProcessChangeService],
  exports: [ProductProcessChangeService],
})
export class ProductProcessChangeModule {}
