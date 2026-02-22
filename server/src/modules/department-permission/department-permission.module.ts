import { Module } from '@nestjs/common';
import { DepartmentPermissionService } from './department-permission.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DepartmentPermissionService],
  exports: [DepartmentPermissionService],
})
export class DepartmentPermissionModule {}
