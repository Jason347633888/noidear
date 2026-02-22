import { Module } from '@nestjs/common';
import { DepartmentPermissionController } from './department-permission.controller';
import { DepartmentPermissionService } from './department-permission.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DepartmentPermissionController],
  providers: [DepartmentPermissionService],
  exports: [DepartmentPermissionService],
})
export class DepartmentPermissionModule {}
