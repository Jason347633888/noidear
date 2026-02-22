import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExamService } from './exam.service';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@ApiTags('培训管理 - 在线考试')
@Controller('training/exam')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post('start')
  @ApiOperation({ summary: '开始考试' })
  async startExam(@Body() dto: StartExamDto, @Request() req: any) {
    return this.examService.startExam(dto, req.user.id);
  }

  @Post('submit')
  @ApiOperation({ summary: '提交考试答案' })
  async submitExam(@Body() dto: SubmitExamDto, @Request() req: any) {
    return this.examService.submitExam(dto, req.user.id);
  }
}
