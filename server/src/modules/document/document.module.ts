import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { StorageService } from '../../common/services';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, StorageService],
  exports: [DocumentService],
})
export class DocumentModule {}
