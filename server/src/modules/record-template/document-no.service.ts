import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentNoService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(templateCode: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `${templateCode}-${dateStr}-`;

    const count = await this.prisma.record.count({
      where: { document_no: { startsWith: prefix } },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }
}
