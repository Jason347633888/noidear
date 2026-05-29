import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { InspectionRecordService } from './inspection-record.service';
import { CreateInspectionRecordDto } from './dto/create-inspection-record.dto';

const DEFAULT_COMPANY_ID = '1';

@UseGuards(JwtAuthGuard)
@Controller('inspection-records')
export class InspectionRecordController {
  constructor(private readonly service: InspectionRecordService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateInspectionRecordDto) {
    const dtoWithCompany: CreateInspectionRecordDto = {
      ...dto,
      company_id: DEFAULT_COMPANY_ID,
    };
    return this.service.create(dtoWithCompany);
  }
}
