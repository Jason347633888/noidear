import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

class RecordAgentActionDto {
  tool: string;
  path?: string;
  method?: string;
  result: string;
  errorCode?: string;
  executedAs: string;
  durationMs: number;
  sessionId?: string;
}

@ApiTags('Agent 审计')
@ApiBearerAuth()
@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('actions')
  @ApiOperation({ summary: '记录 Agent 操作审计日志（MCP 内部使用）' })
  record(@Body() dto: RecordAgentActionDto) {
    return this.prisma.agentAction.create({
      data: { id: randomUUID(), ...dto },
    });
  }
}
