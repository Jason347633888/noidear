import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DepartmentModule } from './modules/department/department.module';
import { DocumentModule } from './modules/document/document.module';
// P2: 已删除旧版 TemplateModule 和 TaskModule（统一动态表单期三）
// import { TemplateModule } from './modules/template/template.module';
// import { TaskModule } from './modules/task/task.module';
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
import { RecordTemplateModule } from './modules/record-template/record-template.module';
import { RecordModule } from './modules/record/record.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { AuditModule } from './modules/audit/audit.module';
import { BackupModule } from './modules/backup/backup.module';
import { HealthModule } from './modules/health/health.module';
import { TrainingModule } from './modules/training/training.module';
import { SearchModule } from './modules/search/search.module';
import { ImportModule } from './modules/import/import.module';
import { RecordTaskModule } from './modules/record-task/record-task.module';
import { IncomingInspectionModule } from './modules/incoming-inspection/incoming-inspection.module';
import { TraceabilityModule } from './modules/traceability/traceability.module';
import { NonConformanceModule } from './modules/non-conformance/non-conformance.module';
import { CorrectiveActionModule } from './modules/corrective-action/corrective-action.module';
import { CustomerComplaintModule } from './modules/customer-complaint/customer-complaint.module';
import { ProductRecallModule } from './modules/product-recall/product-recall.module';
import { CcpModule } from './modules/ccp/ccp.module';
import { EnvironmentRecordModule } from './modules/environment-record/environment-record.module';
import { ProcessRecordModule } from './modules/process-record/process-record.module';
import { MetalDetectionModule } from './modules/metal-detection/metal-detection.module';
import { CleaningRecordModule } from './modules/cleaning-record/cleaning-record.module';
import { MeasuringEquipmentModule } from './modules/measuring-equipment/measuring-equipment.module';
import { ViolationRecordModule } from './modules/violation-record/violation-record.module';
import { MedicationRecordModule } from './modules/medication-record/medication-record.module';
import { SupplierEvaluationModule } from './modules/supplier-evaluation/supplier-evaluation.module';
import { ChangeEventModule } from './modules/change-event/change-event.module';
import { WasteModule } from './modules/waste/waste.module';
import { VisitorRecordModule } from './modules/visitor-record/visitor-record.module';
import { EmergencyDrillModule } from './modules/emergency-drill/emergency-drill.module';
import { ProductModule } from './modules/product/product.module';
import { RecipeModule } from './modules/recipe/recipe.module';
import { ReworkRecordModule } from './modules/rework-record/rework-record.module';
import { FragileItemInspectionModule } from './modules/fragile-item-inspection/fragile-item-inspection.module';
import { ChangeComplianceRecordModule } from './modules/change-compliance-record/change-compliance-record.module';
import { ChangeVerificationRecordModule } from './modules/change-verification-record/change-verification-record.module';
import { LineChangeCheckRecordModule } from './modules/line-change-check-record/line-change-check-record.module';
import { FoodSafetyCultureRecordModule } from './modules/food-safety-culture-record/food-safety-culture-record.module';
import { ProcessModule } from './modules/process/process.module';
import { ProcessStepModule } from './modules/process-step/process-step.module';
import { ExternalPartyModule } from './modules/external-party/external-party.module';
import { PackagingMaterialUsageModule } from './modules/packaging-material-usage/packaging-material-usage.module';
import { WorkflowTriggersModule } from './modules/workflow-triggers/workflow-triggers.module';
import { ShiftInstanceModule } from './modules/shift-instance/shift-instance.module';
import { ProductionRunModule } from './modules/production-run/production-run.module';
import { ScheduledTaskModule } from './modules/scheduled-task/scheduled-task.module';
import { UploadModule } from './modules/upload/upload.module';
import { ModelLandingModule } from './modules/model-landing/model-landing.module';
import { TodoModule } from './modules/todo/todo.module';
import { TaskModule } from './modules/task/task.module';
import { UnifiedApprovalModule } from './modules/unified-approval/unified-approval.module';
import { WorkshopAreaModule } from './modules/workshop-area/workshop-area.module';
import { TeamShiftModule } from './modules/team-shift/team-shift.module';
import { MixingModule } from './modules/mixing/mixing.module';
import { ProductProcessChangeModule } from './modules/product-process-change/product-process-change.module';
import { OrgBootstrapModule } from './modules/org-bootstrap/org-bootstrap.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule.forRoot(),
    AuthModule,
    UserModule,
    DepartmentModule,
    DocumentModule,
    // TemplateModule,  // P2: 已删除旧版模块（统一动态表单期三）
    // TaskModule,      // P2: 已删除旧版模块（统一动态表单期三）
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
    RecordTemplateModule,
    RecordModule,
    WarehouseModule,
    SystemConfigModule,
    EquipmentModule,
    AuditModule,
    BackupModule,
    HealthModule,
    TrainingModule,
    SearchModule,
    ImportModule,
    RecordTaskModule,
    IncomingInspectionModule,
    TraceabilityModule,
    NonConformanceModule,
    CorrectiveActionModule,
    CustomerComplaintModule,
    ProductRecallModule,
    CcpModule,
    EnvironmentRecordModule,
    ProcessRecordModule,
    MetalDetectionModule,
    CleaningRecordModule,
    MeasuringEquipmentModule,
    ViolationRecordModule,
    MedicationRecordModule,
    SupplierEvaluationModule,
    ChangeEventModule,
    WasteModule,
    VisitorRecordModule,
    EmergencyDrillModule,
    ProductModule,
    RecipeModule,
    ReworkRecordModule,
    FragileItemInspectionModule,
    ChangeComplianceRecordModule,
    ChangeVerificationRecordModule,
    LineChangeCheckRecordModule,
    FoodSafetyCultureRecordModule,
    ProcessModule,
    ProcessStepModule,
    ExternalPartyModule,
    PackagingMaterialUsageModule,
    WorkflowTriggersModule,
    ShiftInstanceModule,
    ProductionRunModule,
    ScheduledTaskModule,
    UploadModule,
    ModelLandingModule,
    TodoModule,
    TaskModule,
    UnifiedApprovalModule,
    WorkshopAreaModule,
    TeamShiftModule,
    MixingModule,
    ProductProcessChangeModule,
    OrgBootstrapModule,
  ],
  providers: [],
})
export class AppModule {}
