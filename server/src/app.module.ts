import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
import { RoleModule } from './modules/role/role.module';
import { PermissionModule } from './modules/permission/permission.module';
import { FineGrainedPermissionModule } from './modules/fine-grained-permission/fine-grained-permission.module';
import { UserPermissionModule } from './modules/user-permission/user-permission.module';
import { DepartmentPermissionModule } from './modules/department-permission/department-permission.module';
import { RedisModule } from './modules/redis/redis.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { RecordTemplateModule } from './modules/record-template/record-template.module';
import { RecordModule } from './modules/record/record.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { WechatModule } from './modules/wechat/wechat.module';
import { AuditModule } from './modules/audit/audit.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { AlertModule } from './modules/alert/alert.module';
import { BackupModule } from './modules/backup/backup.module';
import { HealthModule } from './modules/health/health.module';
import { TrainingModule } from './modules/training/training.module';
import { TodoModule } from './modules/todo/todo.module';
import { InternalAuditModule } from './modules/internal-audit/internal-audit.module';
import { SearchModule } from './modules/search/search.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { ImportModule } from './modules/import/import.module';
import { I18nAppModule } from './modules/i18n/i18n.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 分钟时间窗口
        limit: 100, // 每分钟最多 100 次请求
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule.forRoot(),
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
    RoleModule,
    PermissionModule,
    FineGrainedPermissionModule,
    UserPermissionModule,
    DepartmentPermissionModule,
    StatisticsModule,
    WorkflowModule,
    RecordTemplateModule,
    RecordModule,
    WarehouseModule,
    SystemConfigModule,
    EquipmentModule,
    MobileModule,
    WechatModule,
    AuditModule,
    MonitoringModule,
    AlertModule,
    BackupModule,
    HealthModule,
    TrainingModule,
    TodoModule,
    InternalAuditModule,
    SearchModule,
    RecommendationModule,
    ImportModule,
    I18nAppModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
