import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TodoService } from './todo.service';
import { QueryTodoDto } from './dto/query-todo.dto';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ApiTags('待办任务')
@ModuleKey('work_execution')
@Controller('todos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户待办列表（按 ownership 范围）' })
  findAll(@Ownership() ownership: OwnershipContext) {
    return this.todoService.listForUser(ownership);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取当前用户待办统计（用于 badge）' })
  getStatistics(@Request() req: any) {
    return this.todoService.getStatistics(req.user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成指定待办（非幂等，重复提交 409）' })
  complete(@Param('id') id: string, @Request() req: any) {
    return this.todoService.complete(id, req.user.id);
  }
}
