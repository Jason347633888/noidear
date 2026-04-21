import { Module } from '@nestjs/common';
import { PackagingMaterialUsageController } from './packaging-material-usage.controller';
import { PackagingMaterialUsageService } from './packaging-material-usage.service';

@Module({
  controllers: [PackagingMaterialUsageController],
  providers: [PackagingMaterialUsageService],
  exports: [PackagingMaterialUsageService],
})
export class PackagingMaterialUsageModule {}
