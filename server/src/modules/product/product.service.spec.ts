import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { BusinessDocumentLinkService } from '../document/services/business-document-link.service';
import { ProductService } from './product.service';

describe('ProductService report documents', () => {
  let service: ProductService;
  let prisma: PrismaService;
  let storage: jest.Mocked<StorageService>;
  let businessDocumentLinkService: jest.Mocked<BusinessDocumentLinkService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
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

    service = module.get(ProductService);
    prisma = module.get(PrismaService);
    storage = module.get(StorageService);
    businessDocumentLinkService = module.get(BusinessDocumentLinkService);
  });

  it('uploads an external inspection report as Document and BusinessDocumentLink', async () => {
    const file = {
      originalname: 'product-report.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;
    const testedAt = new Date('2026-04-01');
    const expiresAt = new Date('2027-04-01');

    jest.spyOn(prisma.product, 'findFirst').mockResolvedValue({
      id: 'product-001',
      name: '产品A',
      code: 'P-001',
    } as any);
    storage.uploadFile.mockResolvedValue({ path: 'product-reports/product-report.pdf' } as any);
    storage.getSignedUrl.mockResolvedValue('https://preview.local/product-report.pdf');
    (prisma.document.create as jest.Mock).mockResolvedValue({ id: 'doc-001' });
    businessDocumentLinkService.link.mockResolvedValue({ id: 'link-001' } as any);

    const result = await service.uploadReport('product-001', {
      reportName: '外检报告',
      reportNo: 'R-001',
      testedAt,
      conclusion: 'pass',
      expiresAt,
    }, file, 'user-1');

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: '外检报告',
        filePath: 'product-reports/product-report.pdf',
        fileName: 'product-report.pdf',
        document_type: 'EXTERNAL_FILE',
        creatorId: 'user-1',
      }),
    });
    expect(businessDocumentLinkService.link).toHaveBeenCalledWith(expect.objectContaining({
      documentId: 'doc-001',
      businessType: 'product',
      businessId: 'product-001',
      documentKind: 'external_inspection_report',
      expiresAt,
      metadata: expect.objectContaining({ reportNo: 'R-001', testedAt: testedAt.toISOString(), conclusion: 'pass' }),
    }));
    expect(result.preview).toEqual({
      type: 'pdf',
      url: 'https://preview.local/product-report.pdf',
      fileName: 'product-report.pdf',
    });
  });
});
