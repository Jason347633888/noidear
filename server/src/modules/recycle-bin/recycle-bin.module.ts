import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RecycleBinController } from './recycle-bin.controller';
import { RecycleBinService } from './recycle-bin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { NotificationModule } from '../notification/notification.module';
import { DocumentModule } from '../document/document.module';
import { StorageService } from '../../common/services';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    OperationLogModule,
    NotificationModule,
    DocumentModule,
  ],
  controllers: [RecycleBinController],
  providers: [RecycleBinService, StorageService],
  exports: [RecycleBinService],
})
export class RecycleBinModule {}
