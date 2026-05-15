import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

const STATUS_LABELS = {
  planned: '计划中',
  ongoing: '进行中',
  completed: '已完成',
  cancelled: '已取消',
} as const;

const MAX_TRAINING_STATISTICS_EXPORT_ROWS = 10000;

export function mapTrainingStatusLabel(status: keyof typeof STATUS_LABELS): string {
  const label = STATUS_LABELS[status];
  if (!label) throw new BadRequestException(`training status out of contract: ${status}`);
  return label;
}

@Injectable()
export class TrainingStatisticsExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportProjects(): Promise<Buffer> {
    const total = await this.prisma.trainingProject.count();
    if (total > MAX_TRAINING_STATISTICS_EXPORT_ROWS) {
      throw new BadRequestException(`培训统计导出最多支持 ${MAX_TRAINING_STATISTICS_EXPORT_ROWS} 条`);
    }

    const projects = await this.prisma.trainingProject.findMany({
      orderBy: { createdAt: 'desc' },
      take: MAX_TRAINING_STATISTICS_EXPORT_ROWS,
      include: {
        plan: {
          select: { year: true, title: true },
        },
        learningRecords: {
          select: { id: true },
        },
      },
    });

    const trainerIds = [...new Set(projects.map((project) => project.trainerId).filter(Boolean))];
    const trainers = await this.prisma.user.findMany({
      where: { id: { in: trainerIds } },
      select: { id: true, name: true, username: true },
    });
    const trainerNameById = new Map(trainers.map((trainer) => [
      trainer.id,
      trainer.name || trainer.username || '(未命名讲师)',
    ]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('培训统计');
    sheet.addRow(['项目标题', '部门', '季度', '状态', '学员数', '讲师', '计划日期', '创建时间']);
    for (const project of projects) {
      const traineeCount = project.trainees.length;
      sheet.addRow([
        project.title,
        project.department,
        `Q${project.quarter}`,
        mapTrainingStatusLabel(project.status as any),
        traineeCount,
        trainerNameById.get(project.trainerId) ?? '(未匹配讲师)',
        project.scheduledDate ? project.scheduledDate.toISOString().slice(0, 10) : '',
        project.createdAt.toISOString().slice(0, 10),
      ]);
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
