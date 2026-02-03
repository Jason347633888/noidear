import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { StorageService } from '../../common/services';

@Module({
  imports: [ConfigModule],
  controllers: [DocumentController],
  providers: [DocumentService, StorageService],
  exports: [DocumentService],
})
export class DocumentModule {}
