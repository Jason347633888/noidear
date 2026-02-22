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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrainingService } from './training.service';
import { CreateTrainingPlanDto } from './dto/create-plan.dto';
import { UpdateTrainingPlanDto } from './dto/update-plan.dto';
import { QueryTrainingPlanDto } from './dto/query-plan.dto';
import { CreateTrainingProjectDto } from './dto/create-project.dto';
import { UpdateTrainingProjectDto } from './dto/update-project.dto';
import { QueryTrainingProjectDto } from './dto/query-project.dto';

@ApiTags('培训管理')
@Controller('training')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  // ==================== 培训计划管理 ====================

  @Post('plans')
  @ApiOperation({ summary: '创建年度培训计划' })
  async createPlan(@Body() dto: CreateTrainingPlanDto, @Request() req: any) {
    return this.trainingService.createPlan(dto, req.user.id);
  }

  @Get('plans')
  @ApiOperation({ summary: '查询培训计划列表' })
  async findPlans(@Query() dto: QueryTrainingPlanDto) {
    return this.trainingService.findPlans(dto);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: '查询培训计划详情' })
  async findPlanById(@Param('id') id: string) {
    return this.trainingService.findPlanById(id);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: '更新培训计划' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdateTrainingPlanDto) {
    return this.trainingService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: '删除培训计划' })
  async deletePlan(@Param('id') id: string) {
    return this.trainingService.deletePlan(id);
  }

  @Post('plans/:id/submit')
  @ApiOperation({ summary: '提交审批' })
  async submitPlanForApproval(@Param('id') id: string) {
    return this.trainingService.submitPlanForApproval(id);
  }

  // ==================== 培训项目管理 ====================

  @Post('projects')
  @ApiOperation({ summary: '创建培训项目' })
  async createProject(@Body() dto: CreateTrainingProjectDto, @Request() req: any) {
    return this.trainingService.createProject(dto, req.user.id);
  }

  @Get('projects')
  @ApiOperation({ summary: '查询培训项目列表' })
  async findProjects(@Query() dto: QueryTrainingProjectDto) {
    return this.trainingService.findProjects(dto);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: '查询培训项目详情' })
  async findProjectById(@Param('id') id: string) {
    return this.trainingService.findProjectById(id);
  }

  @Put('projects/:id')
  @ApiOperation({ summary: '更新培训项目' })
  async updateProject(@Param('id') id: string, @Body() dto: UpdateTrainingProjectDto) {
    return this.trainingService.updateProject(id, dto);
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: '删除培训项目' })
  async deleteProject(@Param('id') id: string) {
    return this.trainingService.deleteProject(id);
  }

  @Post('projects/:id/trainees')
  @ApiOperation({ summary: '添加学员' })
  async addTrainees(@Param('id') id: string, @Body() body: { userIds: string[] }) {
    return this.trainingService.addTrainees(id, body.userIds);
  }

  @Delete('projects/:id/trainees/:userId')
  @ApiOperation({ summary: '移除学员' })
  async removeTrainee(@Param('id') id: string, @Param('userId') userId: string) {
    return this.trainingService.removeTrainee(id, userId);
  }

  @Put('projects/:id/status')
  @ApiOperation({ summary: '更新培训项目状态' })
  async updateProjectStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.trainingService.updateProjectStatus(id, body.status);
  }
}
