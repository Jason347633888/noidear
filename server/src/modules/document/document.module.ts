import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { FilePreviewService } from './services';
import { StorageService } from '../../common/services';
import { NotificationModule } from '../notification/notification.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [ConfigModule, NotificationModule, OperationLogModule],
  controllers: [DocumentController],
  providers: [DocumentService, FilePreviewService, StorageService],
  exports: [DocumentService],
})
export class DocumentModule {}
