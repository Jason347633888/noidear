import { Module } from '@nestjs/common';
import { StorageService } from '../../common/services';
import { DocumentModule } from '../document/document.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductCodeGeneratorService } from './product-code-generator.service';
import { MaterialAllergenProfileService } from './material-allergen-profile.service';
import { ProductAllergenSummaryService } from './product-allergen-summary.service';
import { ProductRiskZoneService } from './product-risk-zone.service';
import { ProductValidationService } from './product-validation.service';
import { ProductLabelService } from './product-label.service';

@Module({
  imports: [DocumentModule],
  controllers: [ProductController],
  providers: [ProductService, StorageService, ProductCodeGeneratorService, MaterialAllergenProfileService, ProductAllergenSummaryService, ProductRiskZoneService, ProductValidationService, ProductLabelService],
  exports: [ProductService, ProductCodeGeneratorService, MaterialAllergenProfileService, ProductAllergenSummaryService, ProductRiskZoneService, ProductValidationService, ProductLabelService],
})
export class ProductModule {}
