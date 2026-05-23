import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModuleAccessService } from './module-access.service';
import { ModuleAccessController } from './module-access.controller';
import { AdminModuleAccessController } from './admin-module-access.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ModuleAccessController, AdminModuleAccessController],
  providers: [ModuleAccessService],
  exports: [ModuleAccessService],
})
export class ModuleAccessModule {}
