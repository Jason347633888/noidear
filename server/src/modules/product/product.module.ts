import { Module } from '@nestjs/common';
import { StorageService } from '../../common/services';
import { DocumentModule } from '../document/document.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductCodeGeneratorService } from './product-code-generator.service';

@Module({
  imports: [DocumentModule],
  controllers: [ProductController],
  providers: [ProductService, StorageService, ProductCodeGeneratorService],
  exports: [ProductService, ProductCodeGeneratorService],
})
export class ProductModule {}
