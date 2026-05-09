import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ChangeEventService } from './change-event.service';
import { ChangeEventFormTaskService } from './change-event-form-task.service';
import { CreateChangeEventDto } from './dto/create-change-event.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('change-events')
@UseGuards(JwtAuthGuard)
export class ChangeEventController {
  constructor(
    private service: ChangeEventService,
    private formTaskService: ChangeEventFormTaskService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateChangeEventDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id/form-tasks')
  findFormTasks(@Param('id') id: string) {
    return this.formTaskService.listForChange(id);
  }

  @Post('form-tasks/:taskId/fill')
  fillFormTask(
    @Param('taskId') taskId: string,
    @Body() body: { dataJson?: object; existingRecordId?: string },
    @Request() req: { user: { id?: string; userId?: string } },
  ) {
    const userId = req.user.id;
    if (!userId) throw new BadRequestException('Unable to resolve userId from token');
    return this.formTaskService.fillTask(taskId, body.dataJson ?? {}, userId, body.existingRecordId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.updateStatus(id, status, req.user.id);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.approve(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/verifications')
  createVerification(
    @Param('id') id: string,
    @Body() dto: CreateVerificationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.createVerification(
      { ...dto, change_event_id: id },
      req.user.id,
    );
  }

  @Get(':id/verifications')
  findVerifications(@Param('id') id: string) {
    return this.service.findVerifications(id);
  }
}
