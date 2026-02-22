import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { StorageService } from '../../common/services/storage.service';

@Module({
  controllers: [MobileController, SyncController],
  providers: [MobileService, SyncService, StorageService],
  exports: [MobileService, SyncService],
})
export class MobileModule {}
