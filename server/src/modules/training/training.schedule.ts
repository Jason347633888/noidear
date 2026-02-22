import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ArchiveService } from './archive.service';

/**
 * 培训管理定时服务
 * TASK-322: 培训档案自动生成
 */
@Injectable()
export class TrainingScheduleService {
  private readonly logger = new Logger(TrainingScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly archiveService: ArchiveService,
  ) {}

  /**
   * 培训档案自动生成
   * 每小时检查一次
   * BR-112: 培训档案生成时机
   */
  @Cron('0 * * * *')
  async autoGenerateArchives() {
    try {
      // 查找已完成但未生成档案的培训项目
      const projects = await this.prisma.trainingProject.findMany({
        where: {
          status: 'completed',
          archive: null,
        },
        include: {
          plan: {
            select: { createdBy: true },
          },
        },
      });

      let generatedCount = 0;
      let failedCount = 0;

      // 为每个项目生成档案
      for (const project of projects) {
        try {
          await this.archiveService.generateArchive(
            project.id,
            project.plan.createdBy,
          );
          generatedCount++;
          this.logger.log(
            `[Training Schedule] Generated archive for project ${project.id}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to generate archive for project ${project.id}: ${error.message}`,
          );
          failedCount++;
        }
      }

      if (projects.length > 0) {
        this.logger.log(
          `[Training Schedule] Archive generation completed: ${generatedCount} generated, ${failedCount} failed, ${projects.length} total`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[Training Schedule] Failed to auto-generate archives: ${error.message}`,
        error.stack,
      );
    }
  }
}
