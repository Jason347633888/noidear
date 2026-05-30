import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VisitorRecordService } from './visitor-record.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('VisitorRecordService', () => {
  let service: VisitorRecordService;
  let prisma: any;

  const mockVisitorRecord = {
    id: 'vr-1',
    company_id: 'company-1',
    visitor_name: 'Alice',
    organization: 'Corp A',
    purpose: 'Audit',
    visit_date: new Date('2026-05-30T09:00:00Z'),
    escort: null,
    health_status: null,
    notes: null,
    check_in_time: null,
    exit_time: null,
    created_by: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  const mockDeclaration = {
    id: 'decl-1',
    company_id: 'company-1',
    declaration_type: 'visitor_health',
    status: 'approved',
    declared_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      visitorRecord: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      visitorAccessDeclaration: {
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      accessDeclaration: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitorRecordService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<VisitorRecordService>(VisitorRecordService);
  });

  describe('create', () => {
    it('should create a visitor record', async () => {
      prisma.visitorRecord.create.mockResolvedValue(mockVisitorRecord);

      const result = await service.create(
        {
          visitor_name: 'Alice',
          purpose: 'Audit',
          visit_date: '2026-05-30T09:00:00Z',
          organization: 'Corp A',
        },
        'user-1',
      );

      expect(result).toEqual(mockVisitorRecord);
      expect(prisma.visitorRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visitor_name: 'Alice',
            purpose: 'Audit',
            created_by: 'user-1',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted records', async () => {
      prisma.visitorRecord.findMany.mockResolvedValue([mockVisitorRecord]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(prisma.visitorRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deleted_at: null }),
        }),
      );
    });

    it('should filter records by date', async () => {
      prisma.visitorRecord.findMany.mockResolvedValue([mockVisitorRecord]);

      await service.findAll('2026-05-30');

      expect(prisma.visitorRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visit_date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('linkDeclarations', () => {
    it('should link multiple declarations with their declaration_type to a visitor record', async () => {
      prisma.visitorRecord.findUnique.mockResolvedValue(mockVisitorRecord);
      prisma.accessDeclaration.findMany.mockResolvedValue([
        { ...mockDeclaration, id: 'decl-1', declaration_type: 'visitor_health' },
        { ...mockDeclaration, id: 'decl-2', declaration_type: 'visitor_confidentiality' },
      ]);
      prisma.visitorAccessDeclaration.findMany.mockResolvedValue([]);
      prisma.visitorAccessDeclaration.createMany.mockResolvedValue({ count: 2 });

      const result = await service.linkDeclarations('vr-1', [
        { access_declaration_id: 'decl-1', declaration_type: 'visitor_health' },
        { access_declaration_id: 'decl-2', declaration_type: 'visitor_confidentiality' },
      ]);

      expect(result.count).toBe(2);
      expect(prisma.visitorAccessDeclaration.createMany).toHaveBeenCalledWith({
        data: [
          {
            visitor_record_id: 'vr-1',
            access_declaration_id: 'decl-1',
            declaration_type: 'visitor_health',
          },
          {
            visitor_record_id: 'vr-1',
            access_declaration_id: 'decl-2',
            declaration_type: 'visitor_confidentiality',
          },
        ],
        skipDuplicates: true,
      });
    });

    it('should throw NotFoundException when visitor record not found', async () => {
      prisma.visitorRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.linkDeclarations('nonexistent', [
          { access_declaration_id: 'decl-1', declaration_type: 'visitor_health' },
        ]),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when any declaration not found', async () => {
      prisma.visitorRecord.findUnique.mockResolvedValue(mockVisitorRecord);
      prisma.accessDeclaration.findMany.mockResolvedValue([
        { ...mockDeclaration, id: 'decl-1' },
      ]);

      await expect(
        service.linkDeclarations('vr-1', [
          { access_declaration_id: 'decl-1', declaration_type: 'visitor_health' },
          { access_declaration_id: 'decl-nonexistent', declaration_type: 'visitor_hygiene' },
        ]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkIn', () => {
    it('should record check-in time for visitor', async () => {
      const checkedInRecord = {
        ...mockVisitorRecord,
        check_in_time: new Date('2026-05-30T09:30:00Z'),
      };

      prisma.visitorRecord.findUnique.mockResolvedValue(mockVisitorRecord);
      prisma.visitorAccessDeclaration.findMany.mockResolvedValue([]);
      prisma.visitorRecord.update.mockResolvedValue(checkedInRecord);

      const result = await service.checkIn('vr-1');

      expect(result.check_in_time).toBeDefined();
      expect(prisma.visitorRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vr-1' },
          data: expect.objectContaining({
            check_in_time: expect.any(Date),
          }),
        }),
      );
    });

    it('should block check-in when approved health declaration is required but not linked', async () => {
      prisma.visitorRecord.findUnique.mockResolvedValue(mockVisitorRecord);
      prisma.visitorAccessDeclaration.findMany.mockResolvedValue([]);

      await expect(service.checkIn('vr-1', { requireApprovedHealth: true })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should block check-in when linked health declaration is not approved', async () => {
      const unapprovedHealthLink = {
        visitor_record_id: 'vr-1',
        access_declaration_id: 'decl-1',
        declaration_type: 'visitor_health',
        access_declaration: { ...mockDeclaration, status: 'declared' },
      };

      prisma.visitorRecord.findUnique.mockResolvedValue(mockVisitorRecord);
      prisma.visitorAccessDeclaration.findMany.mockResolvedValue([unapprovedHealthLink]);

      await expect(service.checkIn('vr-1', { requireApprovedHealth: true })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow check-in when approved health declaration exists', async () => {
      const approvedHealthLink = {
        visitor_record_id: 'vr-1',
        access_declaration_id: 'decl-1',
        declaration_type: 'visitor_health',
        access_declaration: { ...mockDeclaration, status: 'approved' },
      };
      const checkedInRecord = {
        ...mockVisitorRecord,
        check_in_time: new Date('2026-05-30T09:30:00Z'),
      };

      prisma.visitorRecord.findUnique.mockResolvedValue(mockVisitorRecord);
      prisma.visitorAccessDeclaration.findMany.mockResolvedValue([approvedHealthLink]);
      prisma.visitorRecord.update.mockResolvedValue(checkedInRecord);

      const result = await service.checkIn('vr-1', { requireApprovedHealth: true });

      expect(result.check_in_time).toBeDefined();
    });

    it('should throw NotFoundException when visitor record not found', async () => {
      prisma.visitorRecord.findUnique.mockResolvedValue(null);

      await expect(service.checkIn('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when visitor already checked in', async () => {
      prisma.visitorRecord.findUnique.mockResolvedValue({
        ...mockVisitorRecord,
        check_in_time: new Date(),
      });

      await expect(service.checkIn('vr-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordExit', () => {
    it('should record exit time without modifying declaration content', async () => {
      const checkedInRecord = {
        ...mockVisitorRecord,
        check_in_time: new Date('2026-05-30T09:30:00Z'),
      };
      const exitedRecord = {
        ...checkedInRecord,
        exit_time: new Date('2026-05-30T11:00:00Z'),
      };

      prisma.visitorRecord.findUnique.mockResolvedValue(checkedInRecord);
      prisma.visitorRecord.update.mockResolvedValue(exitedRecord);

      const result = await service.recordExit('vr-1');

      expect(result.exit_time).toBeDefined();
      expect(prisma.visitorRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vr-1' },
          data: expect.objectContaining({
            exit_time: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when visitor record not found', async () => {
      prisma.visitorRecord.findUnique.mockResolvedValue(null);

      await expect(service.recordExit('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when visitor has not checked in yet', async () => {
      prisma.visitorRecord.findUnique.mockResolvedValue(mockVisitorRecord);

      await expect(service.recordExit('vr-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when exit already recorded', async () => {
      prisma.visitorRecord.findUnique.mockResolvedValue({
        ...mockVisitorRecord,
        check_in_time: new Date(),
        exit_time: new Date(),
      });

      await expect(service.recordExit('vr-1')).rejects.toThrow(BadRequestException);
    });
  });
});
