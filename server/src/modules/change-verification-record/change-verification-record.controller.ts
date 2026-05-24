import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChangeVerificationRecordService } from './change-verification-record.service';
import { CreateChangeVerificationRecordDto } from './dto/create-change-verification-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ModuleKey('product_rd')
@Controller('change-verification-records')
@UseGuards(JwtAuthGuard)
export class ChangeVerificationRecordController {
  constructor(private service: ChangeVerificationRecordService) {}

  @Post()
  create(
    @Body() dto: CreateChangeVerificationRecordDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('event/:eventId')
  findByEvent(@Param('eventId') eventId: string) {
    return this.service.findByEvent(eventId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
