import { Module } from '@nestjs/common';
import { FineGrainedPermissionController } from './fine-grained-permission.controller';
import { FineGrainedPermissionService } from './fine-grained-permission.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FineGrainedPermissionController],
  providers: [FineGrainedPermissionService],
  exports: [FineGrainedPermissionService],
})
export class FineGrainedPermissionModule {}
