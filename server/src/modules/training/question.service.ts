import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建考试题目
   * BR-104: 考试答案验证
   * BR-107: 考试题目顺序
   */
  async createQuestion(dto: CreateQuestionDto) {
    // 验证培训项目存在且可编辑
    const project = await this.getProjectById(dto.projectId);
    this.validateProjectIsEditable(project);

    // 验证答案格式
    this.validateAnswer(dto.type, dto.correctAnswer, dto.options);

    // 计算题目顺序
    const order = dto.order || await this.getNextOrder(dto.projectId);

    return this.prisma.trainingQuestion.create({
      data: {
        projectId: dto.projectId,
        type: dto.type,
        content: dto.content,
        options: dto.options || {},
        correctAnswer: dto.correctAnswer,
        points: dto.points,
        order,
      },
    });
  }

  /**
   * 查询题目列表
   * BR-107: 按 order 排序
   */
  async findQuestions(projectId: string) {
    return this.prisma.trainingQuestion.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * 查询题目详情
   */
  async findQuestionById(id: string) {
    const question = await this.prisma.trainingQuestion.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!question) {
      throw new NotFoundException('题目不存在');
    }

    return question;
  }

  /**
   * 更新题目
   * BR-104: 答案验证
   */
  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    const question = await this.findQuestionById(id);
    const project = await this.getProjectById(question.projectId);
    this.validateProjectIsEditable(project);

    // 如果修改了答案，需要验证格式
    if (dto.correctAnswer) {
      this.validateAnswer(
        question.type,
        dto.correctAnswer,
        dto.options || (question.options as Record<string, string>)
      );
    }

    return this.prisma.trainingQuestion.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除题目
   */
  async deleteQuestion(id: string) {
    const question = await this.findQuestionById(id);
    const project = await this.getProjectById(question.projectId);
    this.validateProjectIsEditable(project);

    await this.prisma.trainingQuestion.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 批量导入题目
   */
  async batchImportQuestions(projectId: string, questions: CreateQuestionDto[]) {
    const project = await this.getProjectById(projectId);
    this.validateProjectIsEditable(project);

    // 验证所有题目
    for (const question of questions) {
      this.validateAnswer(question.type, question.correctAnswer, question.options);
    }

    // 获取起始顺序
    let order = await this.getNextOrder(projectId);

    // 批量创建
    const data = questions.map(q => ({
      projectId,
      type: q.type,
      content: q.content,
      options: q.options || {},
      correctAnswer: q.correctAnswer,
      points: q.points,
      order: q.order || order++,
    }));

    await this.prisma.trainingQuestion.createMany({
      data,
    });

    return { count: questions.length, message: `成功导入 ${questions.length} 道题目` };
  }

  /**
   * 更新题目顺序
   * BR-107: 考试题目顺序
   */
  async updateQuestionsOrder(projectId: string, questionOrders: Array<{ id: string; order: number }>) {
    const project = await this.getProjectById(projectId);
    this.validateProjectIsEditable(project);

    // 批量更新顺序
    await this.prisma.$transaction(
      questionOrders.map(({ id, order }) =>
        this.prisma.trainingQuestion.update({
          where: { id },
          data: { order },
        })
      )
    );

    return { message: '题目顺序更新成功' };
  }

  // ==================== Private Helper Methods ====================

  private async getProjectById(id: string) {
    const project = await this.prisma.trainingProject.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('培训项目不存在');
    }

    return project;
  }

  private validateProjectIsEditable(project: any) {
    if (project.status !== 'planned') {
      throw new BadRequestException('只有计划中的培训项目可以编辑题目');
    }
  }

  private validateAnswer(type: string, answer: string, options?: Record<string, string>) {
    // BR-104: 考试答案验证
    if (type === 'choice') {
      // 选择题答案必须是 A/B/C/D
      if (!['A', 'B', 'C', 'D'].includes(answer)) {
        throw new BadRequestException('选择题答案必须是 A、B、C 或 D');
      }

      // 必须有选项
      if (!options || Object.keys(options).length === 0) {
        throw new BadRequestException('选择题必须提供选项');
      }

      // 答案必须在选项中
      if (!options[answer]) {
        throw new BadRequestException('答案必须在选项中');
      }
    } else if (type === 'judge') {
      // 判断题答案必须是 true/false
      if (!['true', 'false'].includes(answer)) {
        throw new BadRequestException('判断题答案必须是 true 或 false');
      }
    }
  }

  private async getNextOrder(projectId: string): Promise<number> {
    const maxOrder = await this.prisma.trainingQuestion.aggregate({
      where: { projectId },
      _max: { order: true },
    });

    return (maxOrder._max.order || 0) + 1;
  }
}
