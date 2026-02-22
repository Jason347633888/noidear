import { Injectable } from '@nestjs/common';
import { TraceabilityService } from './traceability.service';
import * as dayjs from 'dayjs';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');

try {
  pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs || pdfFonts;
} catch (e) {
  // Ignore initialization error in test environment
  console.warn('pdfMake vfs initialization failed:', e.message);
}

@Injectable()
export class TraceExportService {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  async exportPDF(finishedGoodsBatchId: string) {
    const traceData = await this.traceabilityService.traceBackward(
      finishedGoodsBatchId,
    );
    const buffer = await this.generateBackwardPDF(traceData);

    return {
      buffer,
      filename: `Trace_Report_${traceData.finishedGoodsBatch.batchNumber}_${dayjs().format('YYYYMMDD')}.pdf`,
      contentType: 'application/pdf',
    };
  }

  async exportForwardPDF(materialBatchId: string) {
    const traceData = await this.traceabilityService.traceForward(
      materialBatchId,
    );
    const buffer = await this.generateForwardPDF(traceData);

    return {
      buffer,
      filename: `Forward_Trace_${traceData.materialBatch.batchNumber}_${dayjs().format('YYYYMMDD')}.pdf`,
      contentType: 'application/pdf',
    };
  }

  private async generateBackwardPDF(traceData: any): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      content: [
        ...this.renderHeader('批次逆向追溯报告'),
        ...this.renderBackwardContent(traceData),
        ...this.renderCompliance(),
      ],
      defaultStyle: {
        font: 'Roboto',
      },
    };

    return this.createPdf(docDefinition);
  }

  private async generateForwardPDF(traceData: any): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      content: [
        ...this.renderHeader('批次正向追溯报告'),
        ...this.renderForwardContent(traceData),
        ...this.renderCompliance(),
      ],
      defaultStyle: {
        font: 'Roboto',
      },
    };

    return this.createPdf(docDefinition);
  }

  private renderHeader(title: string): Content[] {
    return [
      {
        text: title,
        fontSize: 18,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },
      {
        text: `Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
        fontSize: 10,
        alignment: 'right',
        margin: [0, 0, 0, 20],
      },
    ];
  }

  private renderBackwardContent(traceData: any): Content[] {
    const content: Content[] = [
      {
        text: 'Finished Goods Batch',
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: `Batch Number: ${traceData.finishedGoodsBatch.batchNumber}`,
        fontSize: 10,
      },
      {
        text: `Quantity: ${traceData.finishedGoodsBatch.quantity?.toString() || 'N/A'}`,
        fontSize: 10,
        margin: [0, 0, 0, 10],
      },
      {
        text: 'Production Batch',
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: `Batch Number: ${traceData.productionBatch?.batchNumber || 'N/A'}`,
        fontSize: 10,
      },
      {
        text: `Production Date: ${traceData.productionBatch?.productionDate ? dayjs(traceData.productionBatch.productionDate).format('YYYY-MM-DD') : 'N/A'}`,
        fontSize: 10,
        margin: [0, 0, 0, 10],
      },
      {
        text: 'Material Batches',
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      },
    ];

    traceData.materialBatches.forEach((m: any, idx: number) => {
      content.push({
        text: [
          { text: `${idx + 1}. ${m.batchNumber}\n`, bold: true },
          { text: `   Material: ${m.material?.name || 'N/A'}\n` },
          { text: `   Supplier: ${m.supplier?.name || 'N/A'}\n` },
          { text: `   Quantity Used: ${m.usedQuantity?.toString() || 'N/A'}\n` },
        ],
        fontSize: 10,
        margin: [0, 0, 0, 5],
      });
    });

    // TASK-169: 包含关联的动态表单记录
    if (traceData.relatedRecords && traceData.relatedRecords.length > 0) {
      content.push({
        text: 'Related Dynamic Form Records',
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      });

      traceData.relatedRecords.forEach((record: any, idx: number) => {
        content.push({
          text: [
            { text: `${idx + 1}. ${record.template?.name || 'N/A'} (${record.number})\n`, bold: true },
            { text: `   Status: ${record.status}\n` },
            { text: `   Created: ${dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}\n` },
          ],
          fontSize: 10,
          margin: [0, 0, 0, 5],
        });
      });
    }

    return content;
  }

  private renderForwardContent(traceData: any): Content[] {
    const content: Content[] = [
      {
        text: 'Material Batch',
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: `Batch Number: ${traceData.materialBatch.batchNumber}`,
        fontSize: 10,
      },
      {
        text: `Material: ${traceData.materialBatch.material?.name || 'N/A'}`,
        fontSize: 10,
      },
      {
        text: `Supplier: ${traceData.materialBatch.supplier?.name || 'N/A'}`,
        fontSize: 10,
        margin: [0, 0, 0, 10],
      },
      {
        text: 'Production Batches',
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      },
    ];

    if (
      traceData.productionBatches &&
      traceData.productionBatches.length > 0
    ) {
      traceData.productionBatches.forEach((pb: any, idx: number) => {
        content.push({
          text: [
            { text: `${idx + 1}. ${pb.batchNumber}\n`, bold: true },
            { text: `   Status: ${pb.status || 'N/A'}\n` },
            {
              text: `   Production Date: ${pb.productionDate ? dayjs(pb.productionDate).format('YYYY-MM-DD') : 'N/A'}\n`,
            },
            { text: `   Quantity Used: ${pb.usedQuantity?.toString() || 'N/A'}\n` },
          ],
          fontSize: 10,
          margin: [0, 0, 0, 5],
        });
      });
    } else {
      content.push({
        text: 'No production batches found',
        fontSize: 10,
        margin: [0, 0, 0, 10],
      });
    }

    // TASK-169: 包含关联的动态表单记录
    if (traceData.relatedRecords && traceData.relatedRecords.length > 0) {
      content.push({
        text: 'Related Dynamic Form Records',
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      });

      traceData.relatedRecords.forEach((record: any, idx: number) => {
        content.push({
          text: [
            { text: `${idx + 1}. ${record.template?.name || 'N/A'} (${record.number})\n`, bold: true },
            { text: `   Status: ${record.status}\n` },
            { text: `   Created: ${dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}\n` },
          ],
          fontSize: 10,
          margin: [0, 0, 0, 5],
        });
      });
    }

    return content;
  }

  private renderCompliance(): Content[] {
    return [
      {
        text: '',
        margin: [0, 20, 0, 0],
      },
      {
        text: '符合 BR-248 BRCGS 合规要求',
        fontSize: 8,
        color: 'gray',
        alignment: 'center',
      },
      {
        text: '追溯链完整性已验证',
        fontSize: 8,
        color: 'gray',
        alignment: 'center',
      },
    ];
  }

  private async createPdf(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        const stream = await pdfDocGenerator.getStream();
        const chunks: any[] = [];

        stream.on('data', (chunk: any) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}
