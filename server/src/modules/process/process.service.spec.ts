import { Test, TestingModule } from '@nestjs/testing';
import { ProcessService } from './process.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProcessStatus } from '@prisma/client';

const mockPrisma = {
  processTemplate: {
    findFirst: jest.fn(),
  },
  processInstance: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  processStepData: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
};

describe('ProcessService', () => {
  let service: ProcessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProcessService>(ProcessService);
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('找不到实例时应抛出 NotFoundException', async () => {
      mockPrisma.processInstance.findUnique.mockResolvedValue(null);
      await expect(service.getInstance('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStepData', () => {
    it('无步骤数据时应返回空 stub', async () => {
      mockPrisma.processInstance.findUnique.mockResolvedValue({
        id: 'inst-1',
        createdById: 'user-1',
        status: ProcessStatus.IN_PROGRESS,
        currentStep: 1,
        template: {},
        createdBy: {},
      });
      mockPrisma.processStepData.findUnique.mockResolvedValue(null);

      const result = await service.getStepData('inst-1', 1);
      expect(result).toEqual({ stepNumber: 1, data: {}, status: 'PENDING' });
    });
  });

  describe('deleteInstance', () => {
    it('非创建者删除时应抛出 ForbiddenException', async () => {
      mockPrisma.processInstance.findUnique.mockResolvedValue({
        id: 'inst-1',
        createdById: 'owner-user',
        status: ProcessStatus.IN_PROGRESS,
        currentStep: 1,
        template: {},
        createdBy: {},
      });

      await expect(service.deleteInstance('inst-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('已完成的实例删除时应抛出 ForbiddenException', async () => {
      mockPrisma.processInstance.findUnique.mockResolvedValue({
        id: 'inst-1',
        createdById: 'user-1',
        status: ProcessStatus.COMPLETED,
        currentStep: 9,
        template: {},
        createdBy: {},
      });

      await expect(service.deleteInstance('inst-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listInstances', () => {
    it('应按 userId 过滤实例列表', async () => {
      const mockInstances = [
        { id: 'inst-1', createdById: 'user-1', template: { name: '测试模板' } },
      ];
      mockPrisma.processInstance.findMany.mockResolvedValue(mockInstances);

      const result = await service.listInstances('user-1');

      expect(mockPrisma.processInstance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdById: 'user-1' },
        }),
      );
      expect(result).toEqual(mockInstances);
    });
  });

  describe('getDefaultTemplate', () => {
    it('无激活模板时应抛出 NotFoundException', async () => {
      mockPrisma.processTemplate.findFirst.mockResolvedValue(null);
      await expect(service.getDefaultTemplate()).rejects.toThrow(NotFoundException);
    });

    it('应返回激活的流程模板', async () => {
      const mockTemplate = { id: 'tpl-1', name: '9步研发流程', isActive: true };
      mockPrisma.processTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.getDefaultTemplate();
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('updateProductName', () => {
    it('应成功更新产品名称', async () => {
      mockPrisma.processInstance.findUnique.mockResolvedValue({
        id: 'inst-1',
        createdById: 'user-1',
        status: ProcessStatus.IN_PROGRESS,
        currentStep: 1,
        template: {},
        createdBy: {},
      });
      const mockUpdated = { id: 'inst-1', productName: '新产品名称' };
      mockPrisma.processInstance.update.mockResolvedValue(mockUpdated);

      const result = await service.updateProductName('inst-1', { productName: '新产品名称' });
      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.processInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inst-1' },
          data: expect.objectContaining({ productName: '新产品名称' }),
        }),
      );
    });
  });

  describe('createInstance', () => {
    it('应成功创建流程实例', async () => {
      const mockCreated = {
        id: 'inst-new',
        templateId: 'tpl-1',
        productName: '测试产品',
        template: { name: '9步研发流程' },
      };
      mockPrisma.processInstance.create.mockResolvedValue(mockCreated);

      const result = await service.createInstance('user-1', {
        templateId: 'tpl-1',
        productName: '测试产品',
      });
      expect(result).toEqual(mockCreated);
    });
  });
});
