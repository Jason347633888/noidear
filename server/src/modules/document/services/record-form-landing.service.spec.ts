import { NotFoundException } from '@nestjs/common';
import { RecordFormLandingService } from './record-form-landing.service';

describe('RecordFormLandingService', () => {
  const prisma = {
    recordFormLandingEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    recordTemplate: {
      findFirst: jest.fn(),
    },
    document: {
      count: jest.fn(),
    },
  };

  const modelLanding = {
    listGroups: jest.fn(),
    getGroup: jest.fn(),
    getFormByCode: jest.fn(),
  };

  const mockForm = {
    code: 'GRSS-KF-JL-01',
    formName: '产品开发评审记录',
    department: '产品开发部',
    templateGroupId: 'FG-process',
  };

  const mockGroup = {
    id: 'FG-process',
    count: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    modelLanding.listGroups.mockReturnValue([mockGroup]);
    modelLanding.getGroup.mockReturnValue({ ...mockGroup, forms: [mockForm] });
    modelLanding.getFormByCode.mockReturnValue(mockForm);
    prisma.recordFormLandingEntry.findMany.mockResolvedValue([]);
    prisma.recordFormLandingEntry.findUnique.mockResolvedValue(null);
    prisma.recordTemplate.findFirst.mockResolvedValue(null);
    prisma.document.count.mockResolvedValue(0);
  });

  function makeService() {
    return new RecordFormLandingService(prisma as any, modelLanding as any);
  }

  describe('list', () => {
    it('returns forms with null landingEntry when no override exists', async () => {
      const service = makeService();
      const result = await service.list({});
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('GRSS-KF-JL-01');
      expect(result[0].landingEntry).toBeNull();
    });

    it('filters by keyword matching code or formName', async () => {
      const service = makeService();
      const result = await service.list({ keyword: '产品开发' });
      expect(result).toHaveLength(1);

      const noResult = await service.list({ keyword: '不存在的关键词' });
      expect(noResult).toHaveLength(0);
    });

    it('filters by department', async () => {
      const service = makeService();
      const result = await service.list({ department: '产品开发部' });
      expect(result).toHaveLength(1);

      const noResult = await service.list({ department: '其他部门' });
      expect(noResult).toHaveLength(0);
    });

    it('filters by templateGroupId', async () => {
      const service = makeService();
      const result = await service.list({ templateGroupId: 'FG-process' });
      expect(result).toHaveLength(1);

      const noResult = await service.list({ templateGroupId: 'FG-other' });
      expect(noResult).toHaveLength(0);
    });

    it('attaches existing landing entry override', async () => {
      const mockEntry = { sourceCode: 'GRSS-KF-JL-01', targetRoute: '/process' };
      prisma.recordFormLandingEntry.findMany.mockResolvedValue([mockEntry]);

      const service = makeService();
      const result = await service.list({});
      expect(result[0].landingEntry).toEqual(mockEntry);
    });

    it('returns targetTemplate details for landing entries', async () => {
      modelLanding.listGroups.mockReturnValue([{ id: 'grp1' }]);
      modelLanding.getGroup.mockReturnValue({
        id: 'grp1',
        forms: [{ code: 'GRSS-PZ-JL-01', formName: '记录表', department: 'PZ', templateGroupId: 'g1' }],
      });
      prisma.recordFormLandingEntry.findMany.mockResolvedValue([{
        sourceCode: 'GRSS-PZ-JL-01',
        targetTemplateId: 'tmpl1',
        targetTemplate: { id: 'tmpl1', code: 'TMP-01', name: '记录模板', status: 'active' },
      }]);

      const service = makeService();
      const result = await service.list({});

      expect(result[0].landingEntry!.targetTemplate).toEqual({
        id: 'tmpl1',
        code: 'TMP-01',
        name: '记录模板',
        status: 'active',
      });
    });

    it('returns null targetTemplate when no template is linked', async () => {
      prisma.recordFormLandingEntry.findMany.mockResolvedValue([{
        sourceCode: 'GRSS-KF-JL-01',
        targetTemplateId: null,
        targetTemplate: null,
      }]);

      const service = makeService();
      const result = await service.list({});

      expect(result[0].landingEntry!.targetTemplate).toBeNull();
    });
  });

  describe('get', () => {
    it('returns form with null landingEntry when not configured', async () => {
      const service = makeService();
      const result = await service.get('GRSS-KF-JL-01');
      expect(result.code).toBe('GRSS-KF-JL-01');
      expect(result.landingEntry).toBeNull();
    });

    it('returns form with existing landing entry', async () => {
      const mockEntry = { sourceCode: 'GRSS-KF-JL-01', targetRoute: '/process' };
      prisma.recordFormLandingEntry.findUnique.mockResolvedValue(mockEntry);

      const service = makeService();
      const result = await service.get('GRSS-KF-JL-01');
      expect(result.landingEntry).toEqual(mockEntry);
    });

    it('returns targetTemplate details for a single entry', async () => {
      prisma.recordFormLandingEntry.findUnique.mockResolvedValue({
        sourceCode: 'GRSS-KF-JL-01',
        targetTemplateId: 'tmpl1',
        targetTemplate: { id: 'tmpl1', code: 'TMP-01', name: '记录模板', status: 'active' },
      });

      const service = makeService();
      const result = await service.get('GRSS-KF-JL-01');

      expect(result.landingEntry!.targetTemplate).toEqual({
        id: 'tmpl1',
        code: 'TMP-01',
        name: '记录模板',
        status: 'active',
      });
    });
  });

  describe('upsertTarget', () => {
    it('upserts route target and returns result', async () => {
      const mockResult = { sourceCode: 'GRSS-KF-JL-01', targetRoute: '/process', targetModule: 'process' };
      prisma.recordFormLandingEntry.upsert.mockResolvedValue(mockResult);

      const service = makeService();
      const result = await service.upsertTarget('GRSS-KF-JL-01', {
        targetModule: 'process',
        targetRoute: '/process',
      });

      expect(result.targetRoute).toBe('/process');
      expect(prisma.recordFormLandingEntry.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sourceCode: 'GRSS-KF-JL-01' },
        }),
      );
    });

    it('defaults relatedDocIds to empty array when not provided', async () => {
      prisma.recordFormLandingEntry.upsert.mockResolvedValue({});
      const service = makeService();
      await service.upsertTarget('GRSS-KF-JL-01', { targetModule: 'process' });

      expect(prisma.recordFormLandingEntry.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ relatedDocIds: [] }),
          update: expect.objectContaining({ relatedDocIds: [] }),
        }),
      );
    });

    it('normalizes blank targetTemplateId to null before upsert', async () => {
      prisma.recordFormLandingEntry.upsert.mockResolvedValue({});
      const service = makeService();
      await service.upsertTarget('GRSS-KF-JL-01', {
        targetModule: 'process',
        targetRoute: '/process',
        targetTemplateId: '   ',
      });

      expect(prisma.recordTemplate.findFirst).not.toHaveBeenCalled();
      expect(prisma.recordFormLandingEntry.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ targetTemplateId: null }),
          update: expect.objectContaining({ targetTemplateId: null }),
        }),
      );
    });

    it('throws NotFoundException when modelLanding returns null', async () => {
      modelLanding.getFormByCode.mockReturnValue(null);
      const service = makeService();
      await expect(service.upsertTarget('UNKNOWN', {})).rejects.toThrow(NotFoundException);
    });

    it('rejects missing target template ids', async () => {
      modelLanding.getFormByCode.mockReturnValue({ code: 'F1', formName: '表单1' });
      prisma.recordTemplate.findFirst.mockResolvedValue(null);

      const service = makeService();
      await expect(
        service.upsertTarget('F1', {
          targetTemplateId: 'tpl-missing',
          targetRoute: '/records',
        } as any),
      ).rejects.toThrow('记录模板不存在');
    });

    it('rejects soft-deleted target template ids', async () => {
      modelLanding.getFormByCode.mockReturnValue({ code: 'F1', formName: '表单1' });
      prisma.recordTemplate.findFirst.mockResolvedValue(null);

      const service = makeService();
      await expect(
        service.upsertTarget('F1', {
          targetTemplateId: 'tpl-deleted',
          targetRoute: '/records',
        } as any),
      ).rejects.toThrow('记录模板不存在');
    });

    it('rejects related document ids that do not exist', async () => {
      modelLanding.getFormByCode.mockReturnValue({ code: 'F1', formName: '表单1' });
      prisma.recordTemplate.findFirst.mockResolvedValue({ id: 'tpl1' });
      prisma.document.count.mockResolvedValue(1);

      const service = makeService();
      await expect(
        service.upsertTarget('F1', {
          targetTemplateId: 'tpl1',
          relatedDocIds: ['doc1', 'doc2'],
        } as any),
      ).rejects.toThrow('相关文件不存在');
    });
  });

  describe('suggest', () => {
    it('suggests business module landing when model landing has a known route', async () => {
      modelLanding.getFormByCode.mockReturnValue({
        code: 'GRSS-KF-JL-11',
        formName: '研发试验记录',
        department: '产品开发部',
        primaryEntity: 'ProductDevelopment',
        targetRoute: '/process/instances',
      });
      prisma.recordFormLandingEntry.findUnique.mockResolvedValue(null);

      const service = makeService();
      const result = await service.suggest('GRSS-KF-JL-11');

      expect(result).toEqual(expect.objectContaining({
        sourceCode: 'GRSS-KF-JL-11',
        landingStatus: 'business_module',
        confirmationStatus: 'suggested',
        confidence: 'high',
        targetRoute: '/process/instances',
      }));
    });

    it('confirms landing and stores governance fields', async () => {
      modelLanding.getFormByCode.mockReturnValue({ code: 'GRSS-PZ-JL-01', formName: '检查表' });
      prisma.recordFormLandingEntry.upsert.mockResolvedValue({
        sourceCode: 'GRSS-PZ-JL-01',
        landingStatus: 'dynamic_form',
        confirmationStatus: 'confirmed',
      });

      const service = makeService();
      const result = await service.confirm('GRSS-PZ-JL-01', {
        landingStatus: 'dynamic_form',
        confirmationStatus: 'confirmed',
        targetTemplateId: 'tpl-1',
        fieldCoverageStatus: 'covered',
      } as any, 'admin-1');

      expect(prisma.recordFormLandingEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
        update: expect.objectContaining({
          landingStatus: 'dynamic_form',
          confirmationStatus: 'confirmed',
          confirmedBy: 'admin-1',
        }),
      }));
      expect(result.confirmationStatus).toBe('confirmed');
    });
  });
});
