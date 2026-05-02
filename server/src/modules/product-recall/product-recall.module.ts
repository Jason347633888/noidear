import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductRecallController } from './product-recall.controller';
import { ProductRecallService } from './product-recall.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductRecallController],
  providers: [ProductRecallService],
  exports: [ProductRecallService],
})
export class ProductRecallModule {}
