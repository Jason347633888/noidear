import { Module } from '@nestjs/common';
import { FineGrainedPermissionController } from './fine-grained-permission.controller';
import { FineGrainedPermissionService } from './fine-grained-permission.service';
import { FineGrainedPermissionGuard } from './fine-grained-permission.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserPermissionModule } from '../user-permission/user-permission.module';

@Module({
  imports: [PrismaModule, UserPermissionModule],
  controllers: [FineGrainedPermissionController],
  providers: [FineGrainedPermissionService, FineGrainedPermissionGuard],
  exports: [FineGrainedPermissionService, FineGrainedPermissionGuard],
})
export class FineGrainedPermissionModule {}
