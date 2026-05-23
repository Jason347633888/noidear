import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModuleAccessService } from './module-access.service';
import { ModuleAccessController } from './module-access.controller';
import { AdminModuleAccessController } from './admin-module-access.controller';
import { OwnershipContextResolver } from './ownership-context';

@Module({
  imports: [PrismaModule],
  controllers: [ModuleAccessController, AdminModuleAccessController],
  providers: [ModuleAccessService, OwnershipContextResolver],
  exports: [ModuleAccessService, OwnershipContextResolver],
})
export class ModuleAccessModule {}
