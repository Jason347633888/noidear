import { NotFoundException } from '@nestjs/common';
import { RecordFormLandingService } from './record-form-landing.service';

describe('RecordFormLandingService', () => {
  const prisma = {
    recordFormLandingEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
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

    it('throws NotFoundException when modelLanding returns null', async () => {
      modelLanding.getFormByCode.mockReturnValue(null);
      const service = makeService();
      await expect(service.upsertTarget('UNKNOWN', {})).rejects.toThrow(NotFoundException);
    });
  });
});
