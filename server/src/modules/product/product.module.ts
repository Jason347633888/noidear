import { Module } from '@nestjs/common';
import { StorageService } from '../../common/services';
import { DocumentModule } from '../document/document.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductCodeGeneratorService } from './product-code-generator.service';
import { MaterialAllergenProfileService } from './material-allergen-profile.service';
import { ProductAllergenSummaryService } from './product-allergen-summary.service';

@Module({
  imports: [DocumentModule],
  controllers: [ProductController],
  providers: [ProductService, StorageService, ProductCodeGeneratorService, MaterialAllergenProfileService, ProductAllergenSummaryService],
  exports: [ProductService, ProductCodeGeneratorService, MaterialAllergenProfileService, ProductAllergenSummaryService],
})
export class ProductModule {}
