import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AgentController],
})
export class AgentModule {}
