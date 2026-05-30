import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { LaundryRecordService } from './laundry-record.service';
import { CreateLaundryWorkRecordDto } from './dto/create-laundry-record.dto';

@ModuleKey('equipment_site')
@Controller('laundry-records')
@UseGuards(JwtAuthGuard)
export class LaundryRecordController {
  constructor(private readonly service: LaundryRecordService) {}

  @Post()
  create(@Body() dto: CreateLaundryWorkRecordDto, @Request() req: AuthenticatedRequest) {
    return this.service.createLaundryWorkRecord({
      ...dto,
      company_id: req.user.companyId,
      operator_id: req.user.id,
      work_date: new Date(dto.work_date),
    });
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.service.findAll(req.user.companyId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.submitLaundryWorkRecord(id, req.user.companyId);
  }

  @Post(':id/verify')
  verify(
    @Param('id') id: string,
    @Body('pass') pass: boolean,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.verifyLaundryWorkRecord(id, req.user.id, pass, req.user.companyId);
  }
}
