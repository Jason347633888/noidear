import { Module } from '@nestjs/common';
import { MixingController } from './mixing.controller';
import { MixingService } from './mixing.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MixingController],
  providers: [MixingService],
  exports: [MixingService],
})
export class MixingModule {}
