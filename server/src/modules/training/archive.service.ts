import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

@Injectable()
export class ArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 生成培训档案
   * BR-112: 培训档案生成时机（项目 completed 时）
   * BR-113: 培训档案归档规则（自动创建四级文件）
   * BR-114: 培训档案唯一性
   * BR-115: 培训档案 PDF 格式
   */
  async generateArchive(projectId: string, userId: string) {
    // 获取培训项目
    const project = await this.getProjectWithDetails(projectId);

    // 权限校验：只有计划创建人可以生成档案
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id: project.planId },
    });

    if (!plan) {
      throw new NotFoundException('培训计划不存在');
    }

    if (plan.createdBy !== userId) {
      throw new BadRequestException('只有培训计划创建人可以生成档案');
    }

    // BR-114: 培训档案唯一性校验
    const existingArchive = await this.prisma.trainingArchive.findUnique({
      where: { projectId },
    });

    if (existingArchive) {
      throw new ConflictException('该培训项目已生成档案');
    }

    // BR-112: 验证项目状态（必须是 completed）
    if (project.status !== 'completed') {
      throw new BadRequestException('只有已完成的培训项目可以生成档案');
    }

    // BR-115: 生成 PDF
    const pdfBuffer = await this.generatePDF(project);

    // 上传到 MinIO
    const year = new Date(project.createdAt).getFullYear();
    const filename = `${project.title}_培训档案.pdf`;
    const uploadResult = await this.storageService.uploadStream(
      pdfBuffer,
      filename,
      'application/pdf',
      `archives/${year}`
    );
    const pdfPath = uploadResult.path;

    // BR-113: 自动归档到文档系统（创建四级文件）
    const document = await this.createDocumentRecord(project, pdfPath);

    // 创建培训档案记录
    const archive = await this.prisma.trainingArchive.create({
      data: {
        projectId,
        documentId: document.id,
        pdfPath,
        generatedAt: new Date(),
      },
    });

    return {
      id: archive.id,
      projectId: archive.projectId,
      documentId: archive.documentId,
      pdfPath: archive.pdfPath,
      generatedAt: archive.generatedAt,
      pdfUrl: await this.storageService.getFileUrl(pdfPath),
    };
  }

  /**
   * 查询培训档案
   */
  async findArchives(projectId?: string) {
    const where = projectId ? { projectId } : {};

    const archives = await this.prisma.trainingArchive.findMany({
      where,
      include: {
        project: {
          include: {
            plan: {
              select: { year: true, title: true },
            },
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
    });

    // 生成下载URL
    const archivesWithUrl = await Promise.all(
      archives.map(async (archive) => ({
        ...archive,
        pdfUrl: await this.storageService.getFileUrl(archive.pdfPath),
      }))
    );

    return archivesWithUrl;
  }

  /**
   * 下载培训档案 PDF
   */
  async downloadArchivePDF(archiveId: string) {
    const archive = await this.prisma.trainingArchive.findUnique({
      where: { id: archiveId },
    });

    if (!archive) {
      throw new NotFoundException('培训档案不存在');
    }

    const fileUrl = await this.storageService.getFileUrl(archive.pdfPath);
    return { url: fileUrl };
  }

  // ==================== Private Helper Methods ====================

  private async getProjectWithDetails(id: string) {
    const project = await this.prisma.trainingProject.findUnique({
      where: { id },
      include: {
        plan: true,
        learningRecords: {
          include: {
            examRecords: {
              orderBy: { submittedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('培训项目不存在');
    }

    return project;
  }

  /**
   * BR-115: 生成培训档案 PDF
   * 包含：基本信息、培训内容、参训人员、培训效果
   */
  private async generatePDF(project: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // 标题
      doc.fontSize(20).text('培训档案', { align: 'center' });
      doc.moveDown();

      // 基本信息
      doc.fontSize(14).text('一、基本信息', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(`培训标题：${project.title}`);
      doc.text(`培训部门：${project.department}`);
      doc.text(`培训讲师：${project.trainerId}`);
      doc.text(`计划日期：${project.scheduledDate ? new Date(project.scheduledDate).toLocaleDateString('zh-CN') : '未设置'}`);
      doc.text(`完成日期：${project.completedAt ? new Date(project.completedAt).toLocaleDateString('zh-CN') : '未完成'}`);
      doc.moveDown();

      // 培训内容
      doc.fontSize(14).text('二、培训内容', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(`培训描述：${project.description || '无'}`);
      doc.text(`培训资料：${project.documentIds.length} 个文档`);
      doc.text(`及格分数：${project.passingScore} 分`);
      doc.text(`最大考试次数：${project.maxAttempts} 次`);
      doc.moveDown();

      // 参训人员
      doc.fontSize(14).text('三、参训人员', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(`总人数：${project.trainees.length} 人`);
      doc.moveDown();

      // 培训效果
      doc.fontSize(14).text('四、培训效果', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);

      const passedCount = project.learningRecords.filter((r: any) => r.passed).length;
      const passRate = ((passedCount / project.learningRecords.length) * 100).toFixed(2);

      doc.text(`通过人数：${passedCount} 人`);
      doc.text(`通过率：${passRate}%`);
      doc.text(`平均分数：${this.calculateAverageScore(project.learningRecords)} 分`);
      doc.moveDown();

      // 学员成绩明细
      doc.fontSize(14).text('五、学员成绩明细', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);

      project.learningRecords.forEach((record: any, index: number) => {
        doc.text(
          `${index + 1}. 学员ID: ${record.userId} | 分数: ${record.examScore} | 考试次数: ${record.attempts} | 状态: ${record.passed ? '通过' : '未通过'}`
        );
      });

      doc.end();
    });
  }

  private calculateAverageScore(records: any[]): string {
    if (records.length === 0) return '0';
    const total = records.reduce((sum, r) => sum + r.examScore, 0);
    return (total / records.length).toFixed(2);
  }

  /**
   * BR-113: 自动归档到文档系统（创建四级文件）
   */
  private async createDocumentRecord(project: any, pdfPath: string) {
    // 生成文档编号：REC-TRAIN-{YYYY}-{序号}
    const year = new Date(project.createdAt).getFullYear();
    const sequenceNumber = await this.getNextSequenceNumber(year);
    const number = `REC-TRAIN-${year}-${String(sequenceNumber).padStart(4, '0')}`;

    // 文档标题：{培训标题}-{日期}
    const title = `${project.title}-${new Date(project.completedAt).toLocaleDateString('zh-CN')}`;

    // 创建四级文件
    return this.prisma.document.create({
      data: {
        id: `doc-${Date.now()}`,
        number,
        title,
        level: 4,
        filePath: pdfPath,
        fileName: `${number}.pdf`,
        fileSize: 0,
        fileType: 'application/pdf',
        status: 'published',
        creatorId: project.trainerId,
      },
    });
  }

  private async getNextSequenceNumber(year: number): Promise<number> {
    const latestDoc = await this.prisma.document.findFirst({
      where: {
        number: {
          startsWith: `REC-TRAIN-${year}-`,
        },
      },
      orderBy: { number: 'desc' },
    });

    if (!latestDoc) return 1;

    const match = latestDoc.number.match(/REC-TRAIN-\d+-(\d+)/);
    return match ? parseInt(match[1], 10) + 1 : 1;
  }
}
