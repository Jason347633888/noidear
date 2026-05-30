import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShelfLifeService } from './shelf-life.service';

const COMPANY_ID = 'company-1';
const STUDY_ID = 'study-1';
const PRODUCT_ID = 'product-1';

const mockPoint1 = {
  id: 'pt-1',
  shelf_life_study_id: STUDY_ID,
  point_code: 'D7',
  sequence: 1,
  planned_at: new Date('2026-06-07T08:00:00Z'),
  status: 'pending',
  skip_reason: null,
  inspection_record_id: null,
  completed_at: null,
  completed_by: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockPoint2 = {
  id: 'pt-2',
  shelf_life_study_id: STUDY_ID,
  point_code: 'D14',
  sequence: 2,
  planned_at: new Date('2026-06-14T08:00:00Z'),
  status: 'pending',
  skip_reason: null,
  inspection_record_id: null,
  completed_at: null,
  completed_by: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockStudy = {
  id: STUDY_ID,
  company_id: COMPANY_ID,
  product_id: PRODUCT_ID,
  retained_sample_id: null,
  study_type: 'initial',
  storage_conditions: { temperature: '4°C' },
  started_at: new Date('2026-05-30T08:00:00Z'),
  planned_ended_at: new Date('2026-06-30T08:00:00Z'),
  actual_ended_at: null,
  final_conclusion: null,
  conclusion_by: null,
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
  points: [mockPoint1, mockPoint2],
};

describe('ShelfLifeService', () => {
  let service: ShelfLifeService;
  let prisma: any;

  beforeEach(async () => {
    const txMock = {
      shelfLifeStudy: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      shelfLifeStudyPoint: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      inspectionRecord: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    prisma = {
      shelfLifeStudy: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      shelfLifeStudyPoint: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      inspectionRecord: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: any) => Promise<any>) => cb(txMock)),
      _txMock: txMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShelfLifeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ShelfLifeService>(ShelfLifeService);
  });

  describe('createShelfLifeStudy', () => {
    it('should create study and one ShelfLifeStudyPoint row per planned inspection node', async () => {
      prisma._txMock.shelfLifeStudy.create.mockResolvedValue(mockStudy);

      const result = await service.createShelfLifeStudy({
        companyId: COMPANY_ID,
        productId: PRODUCT_ID,
        studyType: 'initial',
        storageConditions: { temperature: '4°C' },
        startedAt: '2026-05-30T08:00:00Z',
        plannedEndedAt: '2026-06-30T08:00:00Z',
        points: [
          { pointCode: 'D7', sequence: 1, plannedAt: '2026-06-07T08:00:00Z' },
          { pointCode: 'D14', sequence: 2, plannedAt: '2026-06-14T08:00:00Z' },
        ],
      });

      expect(result).toBeDefined();
      expect(prisma._txMock.shelfLifeStudy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            company_id: COMPANY_ID,
            product_id: PRODUCT_ID,
            study_type: 'initial',
            points: {
              create: expect.arrayContaining([
                expect.objectContaining({ point_code: 'D7', sequence: 1 }),
                expect.objectContaining({ point_code: 'D14', sequence: 2 }),
              ]),
            },
          }),
        }),
      );
    });

    it('should require at least one point', async () => {
      await expect(
        service.createShelfLifeStudy({
          companyId: COMPANY_ID,
          productId: PRODUCT_ID,
          studyType: 'initial',
          storageConditions: {},
          startedAt: '2026-05-30T08:00:00Z',
          plannedEndedAt: '2026-06-30T08:00:00Z',
          points: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate point codes in input', async () => {
      await expect(
        service.createShelfLifeStudy({
          companyId: COMPANY_ID,
          productId: PRODUCT_ID,
          studyType: 'initial',
          storageConditions: {},
          startedAt: '2026-05-30T08:00:00Z',
          plannedEndedAt: '2026-06-30T08:00:00Z',
          points: [
            { pointCode: 'D7', sequence: 1, plannedAt: '2026-06-07T08:00:00Z' },
            { pointCode: 'D7', sequence: 2, plannedAt: '2026-06-14T08:00:00Z' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('attachInspectionRecordToPoint', () => {
    it('should attach an inspection record to a pending point and set status to done', async () => {
      const pendingPoint = { ...mockPoint1, status: 'pending' };
      const irRecord = {
        id: 'ir-1',
        object_type: 'shelf_life_study',
        object_id: STUDY_ID,
        overall_result: 'pass',
      };
      const updatedPoint = {
        ...pendingPoint,
        status: 'done',
        inspection_record_id: 'ir-1',
        completed_at: new Date(),
      };

      prisma._txMock.shelfLifeStudyPoint.findFirst.mockResolvedValue(pendingPoint);
      prisma._txMock.inspectionRecord.findFirst.mockResolvedValue(irRecord);
      prisma._txMock.shelfLifeStudyPoint.update.mockResolvedValue(updatedPoint);
      // findFirst for study
      prisma.shelfLifeStudy = { findFirst: jest.fn().mockResolvedValue(mockStudy) };

      const result = await service.attachInspectionRecordToPoint(
        STUDY_ID,
        'D7',
        'ir-1',
      );

      expect(result.status).toBe('done');
      expect(result.inspection_record_id).toBe('ir-1');
      expect(prisma._txMock.shelfLifeStudyPoint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'done',
            inspection_record_id: 'ir-1',
          }),
        }),
      );
    });

    it('should throw BadRequestException when point is not found', async () => {
      prisma._txMock.shelfLifeStudyPoint.findFirst.mockResolvedValue(null);

      await expect(
        service.attachInspectionRecordToPoint(STUDY_ID, 'D99', 'ir-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when point is not pending', async () => {
      const donePoint = { ...mockPoint1, status: 'done', inspection_record_id: 'ir-old' };
      prisma._txMock.shelfLifeStudyPoint.findFirst.mockResolvedValue(donePoint);

      await expect(
        service.attachInspectionRecordToPoint(STUDY_ID, 'D7', 'ir-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when InspectionRecord object_type is not shelf_life_study', async () => {
      const pendingPoint = { ...mockPoint1, status: 'pending' };
      const wrongTypeIR = {
        id: 'ir-1',
        object_type: 'retained_sample',
        object_id: STUDY_ID,
        overall_result: 'pass',
      };

      prisma._txMock.shelfLifeStudyPoint.findFirst.mockResolvedValue(pendingPoint);
      prisma._txMock.inspectionRecord.findFirst.mockResolvedValue(wrongTypeIR);

      await expect(
        service.attachInspectionRecordToPoint(STUDY_ID, 'D7', 'ir-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when InspectionRecord object_id does not match study', async () => {
      const pendingPoint = { ...mockPoint1, status: 'pending' };
      const wrongStudyIR = {
        id: 'ir-1',
        object_type: 'shelf_life_study',
        object_id: 'other-study-id',
        overall_result: 'pass',
      };

      prisma._txMock.shelfLifeStudyPoint.findFirst.mockResolvedValue(pendingPoint);
      prisma._txMock.inspectionRecord.findFirst.mockResolvedValue(wrongStudyIR);

      await expect(
        service.attachInspectionRecordToPoint(STUDY_ID, 'D7', 'ir-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when InspectionRecord is not found', async () => {
      const pendingPoint = { ...mockPoint1, status: 'pending' };
      prisma._txMock.shelfLifeStudyPoint.findFirst.mockResolvedValue(pendingPoint);
      prisma._txMock.inspectionRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.attachInspectionRecordToPoint(STUDY_ID, 'D7', 'ir-missing'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('skipShelfLifeStudyPoint', () => {
    it('should set point status to skipped with a skip_reason', async () => {
      const pendingPoint = { ...mockPoint1, status: 'pending' };
      const skippedPoint = {
        ...pendingPoint,
        status: 'skipped',
        skip_reason: 'Equipment unavailable',
      };

      prisma._txMock.shelfLifeStudyPoint.findFirst.mockResolvedValue(pendingPoint);
      prisma._txMock.shelfLifeStudyPoint.update.mockResolvedValue(skippedPoint);

      const result = await service.skipShelfLifeStudyPoint(
        STUDY_ID,
        'D7',
        'Equipment unavailable',
        'user-1',
      );

      expect(result.status).toBe('skipped');
      expect(result.skip_reason).toBe('Equipment unavailable');
      expect(prisma._txMock.shelfLifeStudyPoint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'skipped',
            skip_reason: 'Equipment unavailable',
          }),
        }),
      );
    });

    it('should throw BadRequestException when skip_reason is empty', async () => {
      await expect(
        service.skipShelfLifeStudyPoint(STUDY_ID, 'D7', '   ', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when point is not found', async () => {
      prisma._txMock.shelfLifeStudyPoint.findFirst.mockResolvedValue(null);

      await expect(
        service.skipShelfLifeStudyPoint(STUDY_ID, 'D99', 'reason', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when point is already done', async () => {
      const donePoint = { ...mockPoint1, status: 'done' };
      prisma._txMock.shelfLifeStudyPoint.findFirst.mockResolvedValue(donePoint);

      await expect(
        service.skipShelfLifeStudyPoint(STUDY_ID, 'D7', 'reason', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('concludeShelfLifeStudy', () => {
    it('should conclude the study with pass when all points are done/skipped and no IR fails', async () => {
      const studyWithDonePoints = {
        ...mockStudy,
        points: [
          { ...mockPoint1, status: 'done', inspection_record_id: 'ir-1' },
          { ...mockPoint2, status: 'skipped', skip_reason: 'Lab closure' },
        ],
      };
      const concludedStudy = {
        ...studyWithDonePoints,
        status: 'concluded',
        final_conclusion: 'pass',
        conclusion_by: 'user-1',
        actual_ended_at: new Date(),
      };

      prisma._txMock.shelfLifeStudy.findFirst.mockResolvedValue(studyWithDonePoints);
      // findMany is called with where: { overall_result: 'fail' } — returns empty = no failures
      prisma._txMock.inspectionRecord.findMany.mockResolvedValue([]);
      prisma._txMock.shelfLifeStudy.update.mockResolvedValue(concludedStudy);

      const result = await service.concludeShelfLifeStudy(
        STUDY_ID,
        'pass',
        'user-1',
      );

      expect(result.status).toBe('concluded');
      expect(result.final_conclusion).toBe('pass');
    });

    it('should reject pass conclusion when any linked InspectionRecord has overall_result=fail', async () => {
      const studyWithDonePoints = {
        ...mockStudy,
        points: [
          { ...mockPoint1, status: 'done', inspection_record_id: 'ir-1' },
          { ...mockPoint2, status: 'done', inspection_record_id: 'ir-2' },
        ],
      };

      prisma._txMock.shelfLifeStudy.findFirst.mockResolvedValue(studyWithDonePoints);
      // findMany is called with where: { overall_result: 'fail' } — returns the failing records
      prisma._txMock.inspectionRecord.findMany.mockResolvedValue([
        { id: 'ir-2' },
      ]);

      await expect(
        service.concludeShelfLifeStudy(STUDY_ID, 'pass', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow fail conclusion even when linked InspectionRecord has overall_result=fail', async () => {
      const studyWithDonePoints = {
        ...mockStudy,
        points: [
          { ...mockPoint1, status: 'done', inspection_record_id: 'ir-1' },
        ],
      };
      const concludedStudy = {
        ...studyWithDonePoints,
        status: 'concluded',
        final_conclusion: 'fail',
      };

      prisma._txMock.shelfLifeStudy.findFirst.mockResolvedValue(studyWithDonePoints);
      // for 'fail' conclusion, findMany is NOT called (only checked for 'pass')
      prisma._txMock.shelfLifeStudy.update.mockResolvedValue(concludedStudy);

      const result = await service.concludeShelfLifeStudy(STUDY_ID, 'fail', 'user-1');

      expect(result.final_conclusion).toBe('fail');
    });

    it('should throw BadRequestException when some points are still pending', async () => {
      const studyWithPendingPoints = {
        ...mockStudy,
        points: [
          { ...mockPoint1, status: 'done', inspection_record_id: 'ir-1' },
          { ...mockPoint2, status: 'pending' },
        ],
      };

      prisma._txMock.shelfLifeStudy.findFirst.mockResolvedValue(studyWithPendingPoints);

      await expect(
        service.concludeShelfLifeStudy(STUDY_ID, 'pass', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when skipped point has no skip_reason', async () => {
      const studyWithBadSkip = {
        ...mockStudy,
        points: [
          { ...mockPoint1, status: 'skipped', skip_reason: null },
        ],
      };

      prisma._txMock.shelfLifeStudy.findFirst.mockResolvedValue(studyWithBadSkip);

      await expect(
        service.concludeShelfLifeStudy(STUDY_ID, 'pass', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when done point has no inspection_record_id', async () => {
      const studyWithBadDone = {
        ...mockStudy,
        points: [
          { ...mockPoint1, status: 'done', inspection_record_id: null },
        ],
      };

      prisma._txMock.shelfLifeStudy.findFirst.mockResolvedValue(studyWithBadDone);

      await expect(
        service.concludeShelfLifeStudy(STUDY_ID, 'pass', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when study is not found', async () => {
      prisma._txMock.shelfLifeStudy.findFirst.mockResolvedValue(null);

      await expect(
        service.concludeShelfLifeStudy('nonexistent', 'pass', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when study is already concluded', async () => {
      const concludedStudy = { ...mockStudy, status: 'concluded' };
      prisma._txMock.shelfLifeStudy.findFirst.mockResolvedValue(concludedStudy);

      await expect(
        service.concludeShelfLifeStudy(STUDY_ID, 'pass', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
