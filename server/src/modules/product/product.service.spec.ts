import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { BusinessDocumentLinkService } from '../document/services/business-document-link.service';
import { ProductService } from './product.service';
import { ProductCodeGeneratorService } from './product-code-generator.service';

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
            recipe: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            processStep: {
              findMany: jest.fn(),
            },
            productProcessChangePlan: {
              findFirst: jest.fn(),
            },
            changeEvent: {
              findMany: jest.fn(),
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
        {
          provide: ProductCodeGeneratorService,
          useValue: { generate: jest.fn().mockResolvedValue('P-AUTO-001') },
        },
      ],
    }).compile();

    service = module.get(ProductService);
    prisma = module.get(PrismaService);
    storage = module.get(StorageService);
    businessDocumentLinkService = module.get(BusinessDocumentLinkService);
  });

  it('assembles a workbench shape with recipes, process steps, plan and related changes', async () => {
    jest.spyOn(prisma.product, 'findFirst').mockResolvedValue({
      id: 'prod-1',
      name: '产品A',
      status: 'active',
    } as any);
    (prisma.recipe.findFirst as jest.Mock).mockResolvedValue({
      id: 'recipe-active',
      version: 4,
      status: 'active',
      changeEventId: 'change-2',
      lines: [],
    });
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue([
      { id: 'recipe-old', version: 3, status: 'archived', changeEventId: 'change-1' },
    ]);
    (prisma.processStep.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: 'step-1', step_no: 1, deleted_at: null, changeEventId: null }])
      .mockResolvedValueOnce([
        { id: 'step-old', step_no: 0, deleted_at: new Date(), changeEventId: 'change-1' },
      ]);
    (prisma.productProcessChangePlan.findFirst as jest.Mock).mockResolvedValue({
      id: 'plan-1',
      changeEventId: 'change-3',
      status: 'pending_approval',
      scopes: ['recipe'],
    });
    (prisma.changeEvent.findMany as jest.Mock).mockResolvedValue([
      { id: 'change-1', change_no: 'CE-2026-0001', status: 'executed' },
      { id: 'change-2', change_no: 'CE-2026-0002', status: 'executed' },
      { id: 'change-3', change_no: 'CE-2026-0003', status: 'pending' },
    ]);

    const result = await service.getWorkbench('prod-1');

    expect(result.product.id).toBe('prod-1');
    expect(result.currentRecipe?.id).toBe('recipe-active');
    expect(result.archivedRecipes).toHaveLength(1);
    expect(result.processSteps).toHaveLength(1);
    expect(result.archivedProcessSteps).toHaveLength(1);
    expect(result.activePlan?.id).toBe('plan-1');
    expect(result.relatedChanges).toHaveLength(3);
    expect(prisma.changeEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: expect.arrayContaining(['change-1', 'change-2', 'change-3']) } },
        orderBy: { created_at: 'desc' },
      }),
    );
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
