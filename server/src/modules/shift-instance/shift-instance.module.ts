import { Module } from '@nestjs/common';
import { ShiftInstanceController } from './shift-instance.controller';
import { ShiftInstanceService } from './shift-instance.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShiftInstanceController],
  providers: [ShiftInstanceService],
  exports: [ShiftInstanceService],
})
export class ShiftInstanceModule {}
