import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccessDeclarationService } from './access-declaration.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AccessDeclarationService', () => {
  let service: AccessDeclarationService;
  let prisma: any;

  const mockDeclaration = {
    id: 'decl-1',
    company_id: 'company-1',
    declaration_type: 'visitor_health',
    subject_type: 'visitor',
    subject_id: 'visitor-1',
    subject_snapshot: null,
    declaration_content: { temperature: 36.5, healthy: true },
    declared_by: 'user-1',
    declared_at: new Date('2026-05-30T10:00:00Z'),
    approved_by: null,
    approved_at: null,
    approval_conclusion: null,
    approval_opinion: null,
    evidence_file_id: null,
    status: 'declared',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      accessDeclaration: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      visitorAccessDeclaration: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      visitorRecord: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessDeclarationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AccessDeclarationService>(AccessDeclarationService);
  });

  describe('createDeclaration', () => {
    it('should create a visitor_health declaration linked to visitor subject', async () => {
      prisma.accessDeclaration.create.mockResolvedValue(mockDeclaration);

      const result = await service.createDeclaration({
        company_id: 'company-1',
        declaration_type: 'visitor_health',
        subject_type: 'visitor',
        subject_id: 'visitor-1',
        declaration_content: { temperature: 36.5, healthy: true },
        declared_by: 'user-1',
        declared_at: new Date('2026-05-30T10:00:00Z'),
      });

      expect(result).toEqual(mockDeclaration);
      expect(prisma.accessDeclaration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            declaration_type: 'visitor_health',
            subject_type: 'visitor',
            status: 'declared',
          }),
        }),
      );
    });

    it('should create a visitor_confidentiality declaration', async () => {
      const confDeclaration = {
        ...mockDeclaration,
        declaration_type: 'visitor_confidentiality',
        declaration_content: { agreed: true, document_ref: 'NDA-2026-001' },
      };
      prisma.accessDeclaration.create.mockResolvedValue(confDeclaration);

      const result = await service.createDeclaration({
        company_id: 'company-1',
        declaration_type: 'visitor_confidentiality',
        subject_type: 'visitor',
        subject_id: 'visitor-1',
        declaration_content: { agreed: true, document_ref: 'NDA-2026-001' },
        declared_by: 'user-1',
        declared_at: new Date('2026-05-30T10:00:00Z'),
      });

      expect(result.declaration_type).toBe('visitor_confidentiality');
    });

    it('should create an employee_exit declaration linked to User subject', async () => {
      const exitDeclaration = {
        ...mockDeclaration,
        declaration_type: 'employee_exit',
        subject_type: 'user',
        subject_id: 'employee-1',
        declaration_content: { exit_reason: 'resignation', handover_completed: true },
      };
      prisma.accessDeclaration.create.mockResolvedValue(exitDeclaration);

      const result = await service.createDeclaration({
        company_id: 'company-1',
        declaration_type: 'employee_exit',
        subject_type: 'user',
        subject_id: 'employee-1',
        declaration_content: { exit_reason: 'resignation', handover_completed: true },
        declared_by: 'employee-1',
        declared_at: new Date('2026-05-30T10:00:00Z'),
      });

      expect(result.declaration_type).toBe('employee_exit');
      expect(result.subject_type).toBe('user');
    });

    it('should create a package_inspection declaration storing subject snapshot', async () => {
      const pkgDeclaration = {
        ...mockDeclaration,
        declaration_type: 'package_inspection',
        subject_type: 'package',
        subject_id: null,
        subject_snapshot: { package_no: 'PKG-001', sender: 'Supplier A' },
        declaration_content: { inspection_result: 'pass', inspector: 'user-2' },
      };
      prisma.accessDeclaration.create.mockResolvedValue(pkgDeclaration);

      const result = await service.createDeclaration({
        company_id: 'company-1',
        declaration_type: 'package_inspection',
        subject_type: 'package',
        subject_snapshot: { package_no: 'PKG-001', sender: 'Supplier A' },
        declaration_content: { inspection_result: 'pass', inspector: 'user-2' },
        declared_by: 'user-2',
        declared_at: new Date('2026-05-30T10:00:00Z'),
      });

      expect(result.subject_snapshot).toEqual({ package_no: 'PKG-001', sender: 'Supplier A' });
    });

    it('should create a mail_inspection declaration storing subject snapshot', async () => {
      const mailDeclaration = {
        ...mockDeclaration,
        declaration_type: 'mail_inspection',
        subject_type: 'mail',
        subject_snapshot: { mail_no: 'MAIL-001', origin: 'External' },
        declaration_content: { inspection_result: 'pass' },
      };
      prisma.accessDeclaration.create.mockResolvedValue(mailDeclaration);

      const result = await service.createDeclaration({
        company_id: 'company-1',
        declaration_type: 'mail_inspection',
        subject_type: 'mail',
        subject_snapshot: { mail_no: 'MAIL-001', origin: 'External' },
        declaration_content: { inspection_result: 'pass' },
        declared_by: 'user-2',
        declared_at: new Date('2026-05-30T10:00:00Z'),
      });

      expect(result.declaration_type).toBe('mail_inspection');
    });

    it('should create a goods_release declaration', async () => {
      const goodsDeclaration = {
        ...mockDeclaration,
        declaration_type: 'goods_release',
        subject_type: 'goods',
        subject_snapshot: { goods_type: 'finished_product', quantity: 100 },
        declaration_content: { release_reason: 'customer order', authorized_by: 'manager-1' },
      };
      prisma.accessDeclaration.create.mockResolvedValue(goodsDeclaration);

      const result = await service.createDeclaration({
        company_id: 'company-1',
        declaration_type: 'goods_release',
        subject_type: 'goods',
        subject_snapshot: { goods_type: 'finished_product', quantity: 100 },
        declaration_content: { release_reason: 'customer order', authorized_by: 'manager-1' },
        declared_by: 'user-2',
        declared_at: new Date('2026-05-30T10:00:00Z'),
      });

      expect(result.declaration_type).toBe('goods_release');
    });

    it('should reject unknown declaration_type', async () => {
      await expect(
        service.createDeclaration({
          company_id: 'company-1',
          declaration_type: 'unknown_type',
          subject_type: 'visitor',
          declaration_content: {},
          declared_at: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveDeclaration', () => {
    it('should approve declaration and store approver/time/conclusion/opinion', async () => {
      const approvedDeclaration = {
        ...mockDeclaration,
        approved_by: 'approver-1',
        approved_at: new Date('2026-05-30T11:00:00Z'),
        approval_conclusion: 'approved',
        approval_opinion: 'All conditions met',
        status: 'approved',
      };

      prisma.accessDeclaration.findFirst.mockResolvedValue(mockDeclaration);
      prisma.accessDeclaration.update.mockResolvedValue(approvedDeclaration);

      const result = await service.approveDeclaration(
        'decl-1',
        'company-1',
        'approver-1',
        'approved',
        'All conditions met',
      );

      expect(result.approved_by).toBe('approver-1');
      expect(result.approval_conclusion).toBe('approved');
      expect(result.approval_opinion).toBe('All conditions met');
      expect(result.status).toBe('approved');
      expect(prisma.accessDeclaration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'decl-1' },
          data: expect.objectContaining({
            approved_by: 'approver-1',
            approval_conclusion: 'approved',
            approval_opinion: 'All conditions met',
            status: 'approved',
          }),
        }),
      );
    });

    it('should throw NotFoundException when declaration not found', async () => {
      prisma.accessDeclaration.findFirst.mockResolvedValue(null);

      await expect(
        service.approveDeclaration('nonexistent', 'company-1', 'approver-1', 'approved', 'Opinion'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when declaration is already approved', async () => {
      prisma.accessDeclaration.findFirst.mockResolvedValue({
        ...mockDeclaration,
        status: 'approved',
      });

      await expect(
        service.approveDeclaration('decl-1', 'company-1', 'approver-1', 'approved', 'Opinion'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to approve an expired declaration', async () => {
      prisma.accessDeclaration.findFirst.mockResolvedValue({
        ...mockDeclaration,
        status: 'expired',
      });

      await expect(
        service.approveDeclaration('decl-1', 'company-1', 'approver-1', 'approved', 'Opinion'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('expireDeclaration', () => {
    it('should expire a declaration by setting status to expired', async () => {
      const expiredDeclaration = {
        ...mockDeclaration,
        status: 'expired',
      };

      prisma.accessDeclaration.findFirst.mockResolvedValue(mockDeclaration);
      prisma.accessDeclaration.update.mockResolvedValue(expiredDeclaration);

      const result = await service.expireDeclaration('decl-1', 'company-1');

      expect(result.status).toBe('expired');
      expect(prisma.accessDeclaration.update).toHaveBeenCalledWith({
        where: { id: 'decl-1' },
        data: { status: 'expired' },
      });
    });

    it('should throw NotFoundException when declaration not found', async () => {
      prisma.accessDeclaration.findFirst.mockResolvedValue(null);

      await expect(service.expireDeclaration('nonexistent', 'company-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to expire an already expired declaration', async () => {
      prisma.accessDeclaration.findFirst.mockResolvedValue({
        ...mockDeclaration,
        status: 'expired',
      });

      await expect(service.expireDeclaration('decl-1', 'company-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to expire an already approved declaration', async () => {
      prisma.accessDeclaration.findFirst.mockResolvedValue({
        ...mockDeclaration,
        status: 'approved',
      });

      await expect(service.expireDeclaration('decl-1', 'company-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('linkToVisitorRecord', () => {
    it('should create a VisitorAccessDeclaration link with declaration_type from declaration', async () => {
      const link = {
        visitor_record_id: 'vr-1',
        access_declaration_id: 'decl-1',
        declaration_type: 'visitor_health',
      };

      prisma.accessDeclaration.findFirst.mockResolvedValue(mockDeclaration);
      prisma.visitorRecord.findFirst.mockResolvedValue({ id: 'vr-1', company_id: 'company-1' });
      prisma.visitorAccessDeclaration.findUnique.mockResolvedValue(null);
      prisma.visitorAccessDeclaration.create.mockResolvedValue(link);

      const result = await service.linkToVisitorRecord('decl-1', 'vr-1', 'company-1');

      expect(result).toEqual(link);
      expect(prisma.visitorAccessDeclaration.create).toHaveBeenCalledWith({
        data: {
          visitor_record_id: 'vr-1',
          access_declaration_id: 'decl-1',
          declaration_type: 'visitor_health',
        },
      });
    });

    it('should throw NotFoundException when declaration not found', async () => {
      prisma.accessDeclaration.findFirst.mockResolvedValue(null);

      await expect(service.linkToVisitorRecord('nonexistent', 'vr-1', 'company-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when visitor record not found', async () => {
      prisma.accessDeclaration.findFirst.mockResolvedValue(mockDeclaration);
      prisma.visitorRecord.findFirst.mockResolvedValue(null);

      await expect(service.linkToVisitorRecord('decl-1', 'nonexistent', 'company-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when link already exists', async () => {
      prisma.accessDeclaration.findFirst.mockResolvedValue(mockDeclaration);
      prisma.visitorRecord.findFirst.mockResolvedValue({ id: 'vr-1', company_id: 'company-1' });
      prisma.visitorAccessDeclaration.findUnique.mockResolvedValue({
        visitor_record_id: 'vr-1',
        access_declaration_id: 'decl-1',
        declaration_type: 'visitor_health',
      });

      await expect(service.linkToVisitorRecord('decl-1', 'vr-1', 'company-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
