import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('流程模板')
@UseGuards(JwtAuthGuard)
@ModuleKey('production_execution')
@Controller('process/templates')
export class ProcessTemplateController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('default')
  @ApiOperation({ summary: '获取默认流程模板' })
  async findDefault() {
    const template = await this.prisma.processTemplate.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!template) {
      return { code: 404001, data: null, message: '未找到默认流程模板' };
    }

    return { code: 0, data: template, message: 'success' };
  }
}
