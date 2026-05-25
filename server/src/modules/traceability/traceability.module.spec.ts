import { Test } from '@nestjs/testing';
import { TraceabilityModule } from './traceability.module';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';
import { TraceabilityBalanceService } from './traceability-balance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductRecallService } from '../product-recall/product-recall.service';

describe('TraceabilityModule', () => {
  it('registers traceability sub-services for DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TraceabilityModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ProductRecallService)
      .useValue({ create: jest.fn() })
      .compile();

    expect(moduleRef.get(TraceabilityQueryService)).toBeInstanceOf(TraceabilityQueryService);
    expect(moduleRef.get(TraceabilityLinkageService)).toBeInstanceOf(TraceabilityLinkageService);
    expect(moduleRef.get(TraceabilityExportService)).toBeInstanceOf(TraceabilityExportService);
    expect(moduleRef.get(TraceabilityBalanceService)).toBeInstanceOf(TraceabilityBalanceService);
  });
});
