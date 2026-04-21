import { Module } from '@nestjs/common';
import { CustomerComplaintController } from './customer-complaint.controller';
import { CustomerComplaintService } from './customer-complaint.service';

@Module({
  controllers: [CustomerComplaintController],
  providers: [CustomerComplaintService],
  exports: [CustomerComplaintService],
})
export class CustomerComplaintModule {}
