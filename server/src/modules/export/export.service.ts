import { Injectable } from '@nestjs/common';
import {
  ExportDocumentsDto,
  ExportTasksDto,
  ExportTaskRecordsDto,
  ExportDeviationReportsDto,
  ExportApprovalsDto,
  ExportUsersDto,
} from './dto';
import { DocumentExportService } from './services/document-export.service';
import { TaskExportService } from './services/task-export.service';
import { DeviationExportService } from './services/deviation-export.service';
import { ApprovalExportService } from './services/approval-export.service';
import { UserExportService } from './services/user-export.service';

@Injectable()
export class ExportService {
  constructor(
    private readonly documentExport: DocumentExportService,
    private readonly taskExport: TaskExportService,
    private readonly deviationExport: DeviationExportService,
    private readonly approvalExport: ApprovalExportService,
    private readonly userExport: UserExportService,
  ) {}

  exportDocuments(dto: ExportDocumentsDto, user?: any) {
    return this.documentExport.exportDocuments(dto, user);
  }

  exportTasks(dto: ExportTasksDto, user?: any) {
    return this.taskExport.exportTasks(dto, user);
  }

  exportTaskRecords(dto: ExportTaskRecordsDto, user?: any) {
    return this.taskExport.exportTaskRecords(dto, user);
  }

  exportDeviationReports(dto: ExportDeviationReportsDto, user?: any) {
    return this.deviationExport.exportDeviationReports(dto, user);
  }

  exportApprovals(dto: ExportApprovalsDto, user?: any) {
    return this.approvalExport.exportApprovals(dto, user);
  }

  exportUsers(dto: ExportUsersDto) {
    return this.userExport.exportUsers(dto);
  }
}
