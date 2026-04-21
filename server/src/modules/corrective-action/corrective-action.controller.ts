import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CorrectiveActionService } from './corrective-action.service';
import { CreateCapaDto } from './dto/create-capa.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('corrective-actions')
@UseGuards(JwtAuthGuard)
export class CorrectiveActionController {
  constructor(private service: CorrectiveActionService) {}

  @Post()
  create(
    @Body() dto: CreateCapaDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.close(id, req.user.id);
  }
}
