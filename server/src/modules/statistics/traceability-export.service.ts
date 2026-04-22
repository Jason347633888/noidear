import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class TraceabilityExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportBatchPdf(finishedGoodsBatchId: string): Promise<Buffer> {
    const batch = await this.prisma.finishedGoodsBatch.findFirst({
      where: { id: finishedGoodsBatchId },
      include: {
        relatedRecords: {
          include: { template: true },
        },
        productionBatch: true,
      },
    });

    if (!batch) {
      throw new NotFoundException('成品批次不存在');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('成品批次追溯报告', { align: 'center' });
      doc.moveDown();
      doc
        .fontSize(12)
        .text(`批次号: ${batch.batchNumber}`, { continued: false });
      doc.text(
        `生产日期: ${batch.packageDate ? new Date(batch.packageDate).toLocaleDateString('zh-CN') : '未记录'}`,
      );
      doc.text(
        `保质期至: ${batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('zh-CN') : '未记录'}`,
      );
      doc.text(`状态: ${batch.status}`);
      if (batch.shippedTo) {
        doc.text(`发货客户: ${batch.shippedTo}`);
      }
      doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
      doc.moveDown();

      // Production batch info
      if (batch.productionBatch) {
        doc.fontSize(14).text('生产批次信息');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .text(
            `生产批次号: ${(batch.productionBatch as any).batchNumber ?? batch.productionBatchId}`,
          );
        doc.moveDown();
      }

      // Related records
      doc.fontSize(14).text('关联表单记录');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      if (batch.relatedRecords.length === 0) {
        doc.fontSize(10).text('（暂无关联记录）');
      } else {
        for (const record of batch.relatedRecords) {
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
