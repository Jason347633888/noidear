import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { ExcelParserService } from '../../common/services';

@Module({
  controllers: [TemplateController],
  providers: [TemplateService, ExcelParserService],
  exports: [TemplateService],
})
export class TemplateModule {}
