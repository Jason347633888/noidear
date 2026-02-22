import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TodoService } from './todo.service';
import { QueryTodoDto } from './dto/query-todo.dto';

@ApiTags('待办任务管理')
@Controller('todos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  @ApiOperation({ summary: '查询我的待办列表' })
  async findMyTodos(@Query() dto: QueryTodoDto, @Request() req: any) {
    return this.todoService.findMyTodos(dto, req.user.id);
  }

  @Get('statistics')
  @ApiOperation({ summary: '待办任务统计' })
  async getTodoStatistics(@Request() req: any) {
    return this.todoService.getTodoStatistics(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询待办详情' })
  async findTodoById(@Param('id') id: string, @Request() req: any) {
    return this.todoService.findTodoById(id, req.user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成待办' })
  async completeTodo(@Param('id') id: string, @Request() req: any) {
    return this.todoService.completeTodo(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除待办' })
  async deleteTodo(@Param('id') id: string, @Request() req: any) {
    return this.todoService.deleteTodo(id, req.user.id);
  }
}
