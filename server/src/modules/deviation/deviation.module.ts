import { Module, forwardRef } from '@nestjs/common';
import { DeviationService } from './deviation.service';
import { DeviationController } from './deviation.controller';
import { DeviationAnalyticsService } from './deviation-analytics.service';
import { DeviationAnalyticsController } from './deviation-analytics.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExportModule } from '../export/export.module';
import { ApprovalModule } from '../approval/approval.module';

@Module({
  imports: [
    PrismaModule,
    ExportModule,
    forwardRef(() => ApprovalModule),
  ],
  controllers: [DeviationController, DeviationAnalyticsController],
  providers: [DeviationService, DeviationAnalyticsService],
  exports: [DeviationService, DeviationAnalyticsService],
})
export class DeviationModule {}
