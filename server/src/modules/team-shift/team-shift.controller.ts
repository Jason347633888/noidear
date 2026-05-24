import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamShiftService } from './team-shift.service';
import { CreateTeamDto, CreateShiftTypeDto, CreateTeamScheduleDto } from './dto/team-shift.dto';

@ModuleKey('production_execution')
@Controller('team-shifts')
@UseGuards(JwtAuthGuard)
export class TeamShiftController {
  constructor(private readonly service: TeamShiftService) {}

  @Get('teams')
  listTeams() {
    return this.service.listTeams();
  }

  @Post('teams')
  createTeam(@Body() dto: CreateTeamDto) {
    return this.service.createTeam(dto);
  }

  @Get('shift-types')
  listShiftTypes() {
    return this.service.listShiftTypes();
  }

  @Post('shift-types')
  createShiftType(@Body() dto: CreateShiftTypeDto) {
    return this.service.createShiftType(dto);
  }

  @Post('schedules')
  createSchedule(@Body() dto: CreateTeamScheduleDto) {
    return this.service.createSchedule(dto);
  }
}
