import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { InspectionRecordService } from './inspection-record.service';
import { CreateInspectionRecordDto } from './dto/create-inspection-record.dto';

@UseGuards(JwtAuthGuard)
@Controller('inspection-records')
export class InspectionRecordController {
  constructor(private readonly service: InspectionRecordService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateInspectionRecordDto, @Request() req: AuthenticatedRequest) {
    const dtoWithCompany: CreateInspectionRecordDto = {
      ...dto,
      company_id: req.user.companyId,
    };
    return this.service.create(dtoWithCompany);
  }
}
