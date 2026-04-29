import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_FORMAT = 'CP-{序号}';
const TOKEN = '{序号}';

@Injectable()
export class ProductCodeGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(companyId: string): Promise<string> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'product.code.format' },
    });
    const format = config?.value ?? DEFAULT_FORMAT;
    const prefix = format.split(TOKEN)[0] ?? 'CP-';
    let sequence =
      (await this.prisma.product.count({
        where: { company_id: companyId, code: { startsWith: prefix } },
      })) + 1;

    while (true) {
      const code = this.formatCode(format, sequence);
      const existing = await this.prisma.product.findFirst({
        where: { company_id: companyId, code },
        select: { id: true },
      });
      if (!existing) return code;
      sequence += 1;
    }
  }

  private formatCode(format: string, sequence: number): string {
    return format.replace(TOKEN, String(sequence).padStart(6, '0'));
  }
}
