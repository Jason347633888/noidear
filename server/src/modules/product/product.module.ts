import { Module } from '@nestjs/common';
import { StorageService } from '../../common/services';
import { DocumentModule } from '../document/document.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [DocumentModule],
  controllers: [ProductController],
  providers: [ProductService, StorageService],
  exports: [ProductService],
})
export class ProductModule {}
