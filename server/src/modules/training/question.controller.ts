import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@ApiTags('培训管理 - 考试题目')
@Controller('training/questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @ApiOperation({ summary: '创建考试题目' })
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.questionService.createQuestion(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询题目列表' })
  async findQuestions(@Query('projectId') projectId: string) {
    return this.questionService.findQuestions(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询题目详情' })
  async findQuestionById(@Param('id') id: string) {
    return this.questionService.findQuestionById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新题目' })
  async updateQuestion(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionService.updateQuestion(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除题目' })
  async deleteQuestion(@Param('id') id: string) {
    return this.questionService.deleteQuestion(id);
  }

  @Post('batch-import')
  @ApiOperation({ summary: '批量导入题目' })
  async batchImportQuestions(
    @Body() body: { projectId: string; questions: CreateQuestionDto[] }
  ) {
    return this.questionService.batchImportQuestions(body.projectId, body.questions);
  }

  @Put('update-order')
  @ApiOperation({ summary: '更新题目顺序' })
  async updateQuestionsOrder(
    @Body() body: { projectId: string; questionOrders: Array<{ id: string; order: number }> }
  ) {
    return this.questionService.updateQuestionsOrder(body.projectId, body.questionOrders);
  }
}
