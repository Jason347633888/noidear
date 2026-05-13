import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { DocumentExportService } from './services/document-export.service';
import { TaskExportService } from './services/task-export.service';
import { DeviationExportService } from './services/deviation-export.service';
import { UserExportService } from './services/user-export.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExportController],
  providers: [
    ExportService,
    DocumentExportService,
    TaskExportService,
    DeviationExportService,
    UserExportService,
  ],
  exports: [ExportService],
})
export class ExportModule {}
