import { Module } from '@nestjs/common';
import { TeamShiftController } from './team-shift.controller';
import { TeamShiftService } from './team-shift.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeamShiftController],
  providers: [TeamShiftService],
  exports: [TeamShiftService],
})
export class TeamShiftModule {}
