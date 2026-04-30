import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class TraceabilityExportService {
  constructor(private readonly prisma: PrismaService) {}

  // TASK-9: exportBatchPdf now accepts a productionBatchId directly.
  // FinishedGoodsBatch has been removed; ProductionBatch is the canonical batch.
  async exportBatchPdf(productionBatchId: string): Promise<Buffer> {
    const batch = await this.prisma.productionBatch.findFirst({
      where: { id: productionBatchId },
      include: {
        relatedRecords: {
          include: { template: true },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('产品批次不存在');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('产品批次追溯报告', { align: 'center' });
      doc.moveDown();
      doc
        .fontSize(12)
        .text(`批次号: ${batch.batchNumber}`, { continued: false });
      doc.text(
        `生产日期: ${batch.productionDate ? new Date(batch.productionDate).toLocaleDateString('zh-CN') : '未记录'}`,
      );
      doc.text(
        `入库时间: ${batch.warehousedAt ? new Date(batch.warehousedAt).toLocaleDateString('zh-CN') : '未记录'}`,
      );
      doc.text(`状态: ${batch.status}`);
      doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
      doc.moveDown();

      // Related records
      doc.fontSize(14).text('关联表单记录');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      const records = (batch as any).relatedRecords ?? [];
      if (records.length === 0) {
        doc.fontSize(10).text('（暂无关联记录）');
      } else {
        for (const record of records) {
          doc
            .fontSize(10)
            .text(`• ${record.template.name}`, { continued: true })
            .text(`  [${record.number}]`, { align: 'right' });
        }
      }

      doc.end();
    });
  }
}
