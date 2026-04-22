import { Module } from '@nestjs/common';
import { RecordTemplateController } from './record-template.controller';
import { RecordTemplateService } from './record-template.service';
import { DocumentNoService } from './document-no.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecordTemplateController],
  providers: [RecordTemplateService, DocumentNoService],
  exports: [RecordTemplateService, DocumentNoService],
})
export class RecordTemplateModule {}
