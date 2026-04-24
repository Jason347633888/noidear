import { Module, forwardRef } from '@nestjs/common';
import { DeviationService } from './deviation.service';
import { DeviationController } from './deviation.controller';
import { DeviationAliasController } from './deviation-alias.controller';
import { DeviationAnalyticsService } from './deviation-analytics.service';
import { DeviationAnalyticsController } from './deviation-analytics.controller';
import { DeviationCronService } from './deviation-cron.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExportModule } from '../export/export.module';
import { ApprovalModule } from '../approval/approval.module';
@Module({
  imports: [
    PrismaModule,
    ExportModule,
    forwardRef(() => ApprovalModule),
  ],
  controllers: [DeviationController, DeviationAliasController, DeviationAnalyticsController],
  providers: [DeviationService, DeviationAnalyticsService, DeviationCronService],
  exports: [DeviationService, DeviationAnalyticsService],
})
export class DeviationModule {}
