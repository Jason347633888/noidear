import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DepartmentModule } from './modules/department/department.module';
import { DocumentModule } from './modules/document/document.module';
import { TemplateModule } from './modules/template/template.module';
import { TaskModule } from './modules/task/task.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OperationLogModule } from './modules/operation-log/operation-log.module';
import { DeviationModule } from './modules/deviation/deviation.module';
import { ExportModule } from './modules/export/export.module';
import { RecycleBinModule } from './modules/recycle-bin/recycle-bin.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 分钟时间窗口
        limit: 100, // 每分钟最多 100 次请求
      },
    ]),
    PrismaModule,
    AuthModule,
    UserModule,
    DepartmentModule,
    DocumentModule,
    TemplateModule,
    TaskModule,
    NotificationModule,
    OperationLogModule,
    DeviationModule,
    ExportModule,
    RecycleBinModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
