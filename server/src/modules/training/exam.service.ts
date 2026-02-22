import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 开始考试
   * 返回题目列表（不包含正确答案）
   */
  async startExam(dto: StartExamDto, userId: string) {
    // 获取培训项目
    const project = await this.getProjectById(dto.projectId);

    // 验证用户是学员
    if (!project.trainees.includes(userId)) {
      throw new BadRequestException('只有学员可以参加考试');
    }

    // 获取学习记录
    const learningRecord = await this.getLearningRecord(dto.projectId, userId);

    // BR-102: 验证考试次数限制
    if (learningRecord.attempts >= project.maxAttempts) {
      throw new BadRequestException(`已达到最大考试次数（${project.maxAttempts}次）`);
    }

    // 如果已通过，不能再考试
    if (learningRecord.passed) {
      throw new BadRequestException('您已通过考试，无需重新参加');
    }

    // 获取题目（不返回正确答案）
    const questions = await this.prisma.trainingQuestion.findMany({
      where: { projectId: dto.projectId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        type: true,
        content: true,
        options: true,
        points: true,
        order: true,
        // correctAnswer 不返回给前端
      },
    });

    if (questions.length === 0) {
      throw new BadRequestException('该培训项目尚未添加考试题目');
    }

    return {
      project: {
        id: project.id,
        title: project.title,
        passingScore: project.passingScore,
        maxAttempts: project.maxAttempts,
      },
      learningRecord: {
        attempts: learningRecord.attempts,
        remainingAttempts: project.maxAttempts - learningRecord.attempts,
      },
      questions,
    };
  }

  /**
   * 提交考试答案
   * BR-103: 考试及格规则
   * BR-104: 考试答案验证
   * BR-105: 考试自动评分
   * BR-106: 考试记录保存
   */
  async submitExam(dto: SubmitExamDto, userId: string) {
    // 获取培训项目
    const project = await this.getProjectById(dto.projectId);

    // 验证用户是学员
    if (!project.trainees.includes(userId)) {
      throw new BadRequestException('只有学员可以提交考试');
    }

    // 获取学习记录
    const learningRecord = await this.getLearningRecord(dto.projectId, userId);

    // BR-102: 验证考试次数限制
    if (learningRecord.attempts >= project.maxAttempts) {
      throw new BadRequestException(`已达到最大考试次数（${project.maxAttempts}次）`);
    }

    // 如果已通过，不能再考试
    if (learningRecord.passed) {
      throw new BadRequestException('您已通过考试，无需重新提交');
    }

    // 获取题目（包含正确答案用于评分）
    const questions = await this.prisma.trainingQuestion.findMany({
      where: { projectId: dto.projectId },
    });

    // BR-105: 自动评分
    const { score, totalPoints } = this.calculateScore(questions, dto.answers);

    // BR-103: 判断是否及格
    const passed = score >= project.passingScore;

    // BR-106: 创建考试记录
    const examRecord = await this.prisma.examRecord.create({
      data: {
        learningRecordId: learningRecord.id,
        answers: dto.answers,
        score,
        submittedAt: new Date(),
      },
    });

    // 更新学习记录
    const updatedLearningRecord = await this.prisma.learningRecord.update({
      where: { id: learningRecord.id },
      data: {
        attempts: learningRecord.attempts + 1,
        examScore: score,
        passed,
        completedAt: passed ? new Date() : null,
      },
    });

    // BR-109: 如果通过考试，自动完成待办任务
    if (passed) {
      await this.completeTodoTask(dto.projectId, userId);
    }

    // BR-101: 如果所有学员都通过考试，触发档案生成
    await this.checkAndGenerateArchive(dto.projectId);

    return {
      examRecord,
      score,
      totalPoints,
      passed,
      passingScore: project.passingScore,
      attempts: updatedLearningRecord.attempts,
      remainingAttempts: project.maxAttempts - updatedLearningRecord.attempts,
      message: passed ? '恭喜您通过考试！' : '很遗憾，您未通过考试，请继续加油！',
    };
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

  private async getLearningRecord(projectId: string, userId: string) {
    const record = await this.prisma.learningRecord.findFirst({
      where: { projectId, userId },
    });

    if (!record) {
      throw new NotFoundException('学习记录不存在');
    }

    return record;
  }

  /**
   * BR-105: 自动评分逻辑
   */
  private calculateScore(questions: any[], answers: Record<string, string>): { score: number; totalPoints: number } {
    let score = 0;
    let totalPoints = 0;

    for (const question of questions) {
      totalPoints += question.points;

      const userAnswer = answers[question.id];
      if (!userAnswer) continue;

      // BR-104: 对比答案（大小写不敏感）
      if (userAnswer.toLowerCase() === question.correctAnswer.toLowerCase()) {
        score += question.points;
      }
    }

    return { score, totalPoints };
  }

  /**
   * BR-109: 通过考试后自动完成待办任务
   */
  private async completeTodoTask(projectId: string, userId: string) {
    await this.prisma.todoTask.updateMany({
      where: {
        type: 'training_attend',
        relatedId: projectId,
        userId,
        status: 'pending',
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }

  /**
   * BR-101: 所有学员考试完毕后自动触发档案生成
   */
  private async checkAndGenerateArchive(projectId: string) {
    const project = await this.prisma.trainingProject.findUnique({
      where: { id: projectId },
      include: {
        learningRecords: true,
      },
    });

    if (!project) return;

    // 检查是否所有学员都已完成考试
    const allCompleted = project.learningRecords.every(record => record.passed || record.attempts >= project.maxAttempts);

    if (allCompleted) {
      // 触发档案生成（此处仅更新状态，实际生成在 TASK-309 实现）
      await this.prisma.trainingProject.update({
        where: { id: projectId },
        data: { status: 'completed', completedAt: new Date() },
      });
    }
  }
}
