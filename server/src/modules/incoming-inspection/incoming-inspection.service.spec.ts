import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { BusinessDocumentLinkService } from '../document/services/business-document-link.service';
import { IncomingInspectionService } from './incoming-inspection.service';

describe('IncomingInspectionService report documents', () => {
  let service: IncomingInspectionService;
  let prisma: PrismaService;
  let storage: jest.Mocked<StorageService>;
  let businessDocumentLinkService: jest.Mocked<BusinessDocumentLinkService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomingInspectionService,
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: PrismaService,
          useValue: {
            incomingInspection: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
            document: { create: jest.fn() },
            businessDocumentLink: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            getSignedUrl: jest.fn(),
          },
        },
        {
          provide: BusinessDocumentLinkService,
          useValue: { link: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(IncomingInspectionService);
    prisma = module.get(PrismaService);
    storage = module.get(StorageService);
    businessDocumentLinkService = module.get(BusinessDocumentLinkService);
  });

  it('uploads an incoming inspection report as Document and BusinessDocumentLink', async () => {
    const file = {
      originalname: 'inspection-report.pdf',
      mimetype: 'application/pdf',
      size: 2048,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;
    const testedAt = new Date('2026-04-02');
    const expiresAt = new Date('2027-04-02');

    jest.spyOn(prisma.incomingInspection, 'findFirst').mockResolvedValue({
      id: 'inspection-001',
      material_batch_id: 'batch-001',
      overall_result: 'pass',
    } as any);
    storage.uploadFile.mockResolvedValue({ path: 'incoming-inspection-reports/report.pdf' } as any);
    storage.getSignedUrl.mockResolvedValue('https://preview.local/inspection-report.pdf');
    (prisma.document.create as jest.Mock).mockResolvedValue({ id: 'doc-002' });
    businessDocumentLinkService.link.mockResolvedValue({ id: 'link-002' } as any);

    const result = await service.uploadReport('inspection-001', {
      reportName: '来料检验报告',
      reportNo: 'IR-001',
      testedAt,
      conclusion: 'pass',
      expiresAt,
    }, file, 'user-1', 1);

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: '来料检验报告',
        filePath: 'incoming-inspection-reports/report.pdf',
        fileName: 'inspection-report.pdf',
        document_type: 'EXTERNAL_FILE',
        creatorId: 'user-1',
      }),
    });
    expect(businessDocumentLinkService.link).toHaveBeenCalledWith(expect.objectContaining({
      documentId: 'doc-002',
      businessType: 'incoming_inspection',
      businessId: 'inspection-001',
      documentKind: 'external_inspection_report',
      expiresAt,
      metadata: expect.objectContaining({ reportNo: 'IR-001', testedAt: testedAt.toISOString(), conclusion: 'pass' }),
    }));
    expect(result.preview).toEqual({
      type: 'pdf',
      url: 'https://preview.local/inspection-report.pdf',
      fileName: 'inspection-report.pdf',
    });
  });
});
