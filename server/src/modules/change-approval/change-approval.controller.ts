import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChangeApprovalService } from './change-approval.service';
import { CreateChangeApprovalDto } from './dto/create-change-approval.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('change-approvals')
@UseGuards(JwtAuthGuard)
export class ChangeApprovalController {
  constructor(private service: ChangeApprovalService) {}

  @Post()
  create(
    @Body() dto: CreateChangeApprovalDto,
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
