import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import { StorageService } from '../../../common/services/storage.service';
import { QueryReportDto } from './dto';
import * as PDFDocument from 'pdfkit';
import { Snowflake } from '../../../common/utils';

@Injectable()
export class ReportService {
  private readonly snowflake = new Snowflake();

  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLogService: OperationLogService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 完成内审计划并生成报告 (BR-130, BR-131, BR-132, BR-133, BR-134)
   */
  async completePlanAndGenerateReport(planId: string, userId: string) {
    const plan = await this.validateAndGetPlan(planId, userId);
    await this.checkCompletionConditions(plan);
    await this.checkReportUniqueness(planId);

    const summary = this.calculateSummary(plan);
    const pdfBuffer = await this.generatePDF(plan, summary);

    const completedYear = new Date().getFullYear();
    const pdfPath = `audit-reports/${completedYear}/${planId}.pdf`;
    await this.uploadPDF(pdfBuffer, pdfPath);

    const documentId = await this.archiveToDocumentSystem(plan, pdfPath, userId);

    const report = await this.createAuditReport(planId, summary, pdfPath, documentId);
    await this.updatePlanStatus(planId);
    await this.logCompletion(userId, planId, report.id, documentId, (plan.findings || []).length);

    return this.formatReportResponse(report, plan);
  }

  /**
   * Get a single audit report by ID
   */
  async getReportById(id: string) {
    const report = await this.prisma.auditReport.findUnique({
      where: { id },
      include: {
        plan: {
          select: {
            id: true,
            title: true,
            type: true,
            startDate: true,
            endDate: true,
            auditor: { select: { id: true, username: true, name: true } },
          },
        },
        document: {
          select: {
            id: true,
            number: true,
            title: true,
            level: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Audit report not found');
    }

    return report;
  }

  /**
   * Query audit reports (with optional planId filter)
   */
  async queryReports(dto: QueryReportDto) {
    const where = dto.planId ? { planId: dto.planId } : {};

    return this.prisma.auditReport.findMany({
      where,
      include: {
        plan: {
          select: {
            id: true,
            title: true,
            type: true,
            startDate: true,
            endDate: true,
            auditor: { select: { id: true, username: true, name: true } },
          },
        },
        document: {
          select: {
            id: true,
            number: true,
            title: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async validateAndGetPlan(planId: string, userId: string) {
    const plan = await this.prisma.auditPlan.findUnique({
      where: { id: planId },
      include: {
        auditor: { select: { id: true, username: true } },
        findings: {
          include: {
            document: {
              select: {
                title: true,
                number: true,
                level: true,
              }
            },
            assignee: { select: { username: true } },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    if (plan.auditorId !== userId) {
      throw new ForbiddenException('Only the assigned auditor can complete the audit plan');
    }

    if (plan.status !== 'pending_rectification') {
      throw new BadRequestException(
        'Audit plan must be in pending_rectification status to complete',
      );
    }

    return plan;
  }

  private async checkCompletionConditions(plan: any) {
    const unverifiedFindings = plan.findings.filter((f: any) => f.status !== 'verified');
    if (unverifiedFindings.length > 0) {
      throw new BadRequestException(
        `Cannot complete audit: ${unverifiedFindings.length} findings are not yet verified`,
      );
    }
  }

  private async checkReportUniqueness(planId: string) {
    const existingReport = await this.prisma.auditReport.findUnique({
      where: { planId },
    });

    if (existingReport) {
      throw new ConflictException('Audit report already exists for this plan');
    }
  }

  private calculateSummary(plan: any) {
    const findings = plan?.findings || [];
    const totalDocuments = new Set(
      findings
        .filter((f: any) => f?.documentId)
        .map((f: any) => f.documentId)
    ).size;

    const conformCount = findings.filter(
      (f: any) => f?.auditResult === '符合'
    ).length;

    const nonConformCount = findings.filter(
      (f: any) => f?.auditResult === '不符合'
    ).length;

    return {
      totalDocuments,
      conformCount,
      nonConformCount,
      byLevel: this.groupByLevel(findings),
      byDepartment: this.groupByDepartment(findings),
      byIssueType: this.groupByIssueType(findings),
    };
  }

  private groupByLevel(findings: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    findings.forEach((f: any) => {
      const level = f?.document?.level;
      if (level != null) {
        result[level] = (result[level] || 0) + 1;
      }
    });
    return result;
  }

  private groupByDepartment(findings: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    findings.forEach((f: any) => {
      const dept = f?.department;
      if (dept) {
        result[dept] = (result[dept] || 0) + 1;
      }
    });
    return result;
  }

  private groupByIssueType(findings: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    findings.forEach((f: any) => {
      const issueType = f?.issueType;
      if (issueType) {
        result[issueType] = (result[issueType] || 0) + 1;
      }
    });
    return result;
  }

  private async generatePDF(plan: any, summary: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.addPDFTitle(doc);
      this.addBasicInfo(doc, plan);
      this.addAuditScope(doc, summary);
      this.addResultsSummary(doc, summary);
      this.addNonConformityList(doc, plan);
      this.addVerificationRecords(doc, plan);
      this.addStatisticalAnalysis(doc, summary);
      this.addPDFFooter(doc);

      doc.end();
    });
  }

  private addPDFTitle(doc: any) {
    doc.fontSize(20).text('【内审报告】', { align: 'center' });
    doc.moveDown();
  }

  private addBasicInfo(doc: any, plan: any) {
    doc.fontSize(14).text('一、基本信息');
    doc.fontSize(10);
    doc.text(`- 内审标题: ${plan.title || 'N/A'}`);
    doc.text(`- 审核类型: ${plan.type || 'N/A'}`);
    doc.text(`- 审核时间: ${this.formatDateRange(plan.startDate, plan.endDate)}`);
    doc.text(`- 内审员: ${plan.auditor?.username || 'N/A'}`);
    doc.text(`- 完成日期: ${this.formatDate(new Date())}`);
    doc.moveDown();
  }

  private addAuditScope(doc: any, summary: any) {
    doc.fontSize(14).text('二、审核范围');
    doc.fontSize(10);
    doc.text(`- 审核文档总数: ${summary.totalDocuments}`);
    Object.entries(summary.byLevel).forEach(([level, count]) => {
      doc.text(`- ${level}级文件: ${count} 份`);
    });
    const departments = Object.keys(summary.byDepartment).join('、');
    doc.text(`- 涉及部门: ${departments || '无'}`);
    doc.moveDown();
  }

  private addResultsSummary(doc: any, summary: any) {
    doc.fontSize(14).text('三、审核结果汇总');
    const total = summary.conformCount + summary.nonConformCount;
    const conformRate = this.calculateRate(summary.conformCount, total);
    const nonConformRate = this.calculateRate(summary.nonConformCount, total);

    doc.fontSize(10);
    doc.text(`- 符合: ${summary.conformCount} (${conformRate}%)`);
    doc.text(`- 不符合: ${summary.nonConformCount} (${nonConformRate}%)`);
    doc.moveDown();
  }

  private addNonConformityList(doc: any, plan: any) {
    doc.fontSize(14).text('四、不符合项清单');
    doc.fontSize(8);

    const nonConformFindings = this.getNonConformFindings(plan);
    nonConformFindings.forEach((finding: any, index: number) => {
      const docNumber = finding?.document?.number || 'N/A';
      const docTitle = finding?.document?.title || 'N/A';
      const issueType = finding?.issueType || 'N/A';
      const description = finding?.description || 'N/A';

      doc.text(`${index + 1}. ${docNumber} - ${docTitle} - ${issueType} - ${description}`);
    });
    doc.moveDown();
  }

  private addVerificationRecords(doc: any, plan: any) {
    doc.fontSize(14).text('五、整改验证记录');
    doc.fontSize(8);

    const nonConformFindings = this.getNonConformFindings(plan);
    nonConformFindings.forEach((finding: any, index: number) => {
      const docNumber = finding?.document?.number || 'N/A';
      const version = finding?.rectificationVersion || 'N/A';
      const verifier = finding?.verifiedBy || 'N/A';
      const verifiedDate = finding?.verifiedAt
        ? this.formatDate(new Date(finding.verifiedAt))
        : 'N/A';

      doc.text(`${index + 1}. ${docNumber} - ${version} - ${verifier} - ${verifiedDate} - 通过`);
    });
    doc.moveDown();
  }

  private addStatisticalAnalysis(doc: any, summary: any) {
    doc.fontSize(14).text('六、统计分析');
    doc.fontSize(10);

    const deptDist = this.formatDistribution(summary.byDepartment);
    const issueDist = this.formatDistribution(summary.byIssueType);

    doc.text(`- 不符合项按部门分布: ${deptDist || '无'}`);
    doc.text(`- 不符合项按问题类型分布: ${issueDist || '无'}`);
    doc.moveDown();
  }

  private addPDFFooter(doc: any) {
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    doc.fontSize(8).text(`生成时间: ${timestamp}`, { align: 'right' });
  }

  private getNonConformFindings(plan: any): any[] {
    return (plan?.findings || []).filter(
      (f: any) => f?.auditResult === '不符合'
    );
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatDateRange(start: Date, end: Date): string {
    return `${this.formatDate(start)} ~ ${this.formatDate(end)}`;
  }

  private calculateRate(count: number, total: number): string {
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  }

  private formatDistribution(dist: Record<string, number>): string {
    return Object.entries(dist)
      .map(([key, value]) => `${key} ${value}`)
      .join(', ');
  }

  private async uploadPDF(buffer: Buffer, path: string): Promise<void> {
    await this.storageService.uploadBuffer(buffer, path);
  }

  private async archiveToDocumentSystem(
    plan: any,
    pdfPath: string,
    userId: string,
  ): Promise<string> {
    const qualityDept = await this.getQualityDepartment();
    const documentNumber = await this.generateDocumentNumber();
    const documentTitle = this.generateDocumentTitle(plan);

    const document = await this.prisma.document.create({
      data: {
        id: this.generateId(),
        number: documentNumber,
        title: documentTitle,
        level: 4,
        version: '1.0',
        filePath: pdfPath,
        fileName: `${documentTitle}.pdf`,
        fileSize: 0,
        fileType: 'application/pdf',
        status: 'published',
        creatorId: userId,
      },
    });

    return document.id;
  }

  private async getQualityDepartment() {
    const qualityDept = await this.prisma.department.findFirst({
      where: { name: '质量部' },
    });

    if (!qualityDept) {
      throw new NotFoundException('质量部 department not found');
    }

    return qualityDept;
  }

  private async generateDocumentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.getReportCountForYear(year);
    const sequence = String(count + 1).padStart(3, '0');
    return `REC-AUDIT-${year}-${sequence}`;
  }

  private async getReportCountForYear(year: number): Promise<number> {
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year + 1}-01-01`);

    return this.prisma.auditReport.count({
      where: {
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
    });
  }

  private generateDocumentTitle(plan: any): string {
    const completedDate = this.formatDate(new Date());
    return `${plan.title}-内审报告-${completedDate}`;
  }

  private async createAuditReport(
    planId: string,
    summary: any,
    pdfPath: string,
    documentId: string,
  ) {
    return this.prisma.auditReport.create({
      data: {
        planId,
        summary,
        pdfUrl: `/${pdfPath}`,
        documentId,
      },
    });
  }

  private async updatePlanStatus(planId: string) {
    await this.prisma.auditPlan.update({
      where: { id: planId },
      data: { status: 'completed' },
    });
  }

  private async logCompletion(
    userId: string,
    planId: string,
    reportId: string,
    documentId: string,
    findingsCount: number,
  ) {
    await this.operationLogService.log({
      userId,
      action: 'complete_audit_plan',
      module: 'internal-audit',
      objectId: planId,
      objectType: 'audit_plan',
      details: {
        reportId,
        documentId,
        findingsCount,
      },
    });
  }

  private formatReportResponse(report: any, plan: any) {
    return {
      ...report,
      plan: {
        id: plan.id,
        title: plan.title,
        status: 'completed',
      },
    };
  }

  /**
   * 生成安全 ID（使用 Snowflake 算法）
   * CRITICAL-3: 替换弱 ID 生成（Date.now() + Math.random()）
   */
  private generateId(): string {
    return this.snowflake.nextId();
  }
}
