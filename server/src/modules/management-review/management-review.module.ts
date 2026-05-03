import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ManagementReviewController } from './management-review.controller';
import { ManagementReviewService } from './management-review.service';

@Module({
  imports: [PrismaModule],
  controllers: [ManagementReviewController],
  providers: [ManagementReviewService],
  exports: [ManagementReviewService],
})
export class ManagementReviewModule {}
