import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TemplateAliasController } from './template-alias.controller';
import { RecordTemplateService } from './record-template.service';
import { OwnershipContext } from '../module-access/ownership-context';
import { CreateRecordTemplateDto } from './dto/create-record-template.dto';
import { UpdateRecordTemplateDto } from './dto/update-record-template.dto';

describe('TemplateAliasController — admin-only write guards', () => {
  let controller: TemplateAliasController;
  let service: jest.Mocked<Partial<RecordTemplateService>>;

  const adminOwnership: OwnershipContext = {
    userId: 'u_admin',
    roleCode: 'admin',
    departmentId: null,
    managedDepartmentIds: undefined,
  };

  const userOwnership: OwnershipContext = {
    userId: 'u_user',
    roleCode: 'user',
    departmentId: 'd_001',
    managedDepartmentIds: [],
  };

  const leaderOwnership: OwnershipContext = {
    userId: 'u_leader',
    roleCode: 'leader',
    departmentId: 'd_001',
    managedDepartmentIds: ['d_001'],
  };

  const mockTemplate = { id: 'tpl_001', code: 'T001', name: '测试模板' };

  beforeEach(async () => {
    service = {
      createForOwnership: jest.fn().mockResolvedValue(mockTemplate),
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      findOne: jest.fn().mockResolvedValue(mockTemplate),
      update: jest.fn().mockResolvedValue(mockTemplate),
      archive: jest.fn().mockResolvedValue(mockTemplate),
      createNewVersion: jest.fn().mockResolvedValue(mockTemplate),
      getVersionHistory: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplateAliasController],
      providers: [{ provide: RecordTemplateService, useValue: service }],
    }).compile();

    controller = module.get<TemplateAliasController>(TemplateAliasController);
  });

  // ─── POST /templates (create) ───────────────────────────────────────────────

  describe('create (POST /templates)', () => {
    const dto: CreateRecordTemplateDto = { code: 'T001', name: '模板1' } as CreateRecordTemplateDto;

    it('non-admin calling create → throws ForbiddenException', () => {
      expect(() => controller.create(dto, userOwnership)).toThrow(ForbiddenException);
      expect(service.createForOwnership).not.toHaveBeenCalled();
    });

    it('leader calling create → throws ForbiddenException', () => {
      expect(() => controller.create(dto, leaderOwnership)).toThrow(ForbiddenException);
      expect(service.createForOwnership).not.toHaveBeenCalled();
    });

    it('admin calling create → calls service.createForOwnership', async () => {
      const result = await controller.create(dto, adminOwnership);
      expect(service.createForOwnership).toHaveBeenCalledWith(dto, adminOwnership);
      expect(result).toEqual(mockTemplate);
    });
  });

  // ─── PUT /templates/:id (update) ────────────────────────────────────────────

  describe('update (PUT /templates/:id)', () => {
    const dto: UpdateRecordTemplateDto = { name: '新名称' } as UpdateRecordTemplateDto;

    it('non-admin calling update → throws ForbiddenException', () => {
      expect(() => controller.update('tpl_001', dto, userOwnership)).toThrow(ForbiddenException);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('admin calling update → calls service.update', async () => {
      const result = await controller.update('tpl_001', dto, adminOwnership);
      expect(service.update).toHaveBeenCalledWith('tpl_001', dto);
      expect(result).toEqual(mockTemplate);
    });
  });

  // ─── POST /templates/:id/archive ────────────────────────────────────────────

  describe('archive (POST /templates/:id/archive)', () => {
    it('non-admin calling archive → throws ForbiddenException', () => {
      expect(() => controller.archive('tpl_001', userOwnership)).toThrow(ForbiddenException);
      expect(service.archive).not.toHaveBeenCalled();
    });

    it('admin calling archive → calls service.archive', async () => {
      const result = await controller.archive('tpl_001', adminOwnership);
      expect(service.archive).toHaveBeenCalledWith('tpl_001');
      expect(result).toEqual(mockTemplate);
    });
  });

  // ─── POST /templates/:id/new-version ────────────────────────────────────────

  describe('createNewVersion (POST /templates/:id/new-version)', () => {
    const dto: UpdateRecordTemplateDto = { name: 'v2' } as UpdateRecordTemplateDto;

    it('non-admin calling createNewVersion → throws ForbiddenException', () => {
      expect(() => controller.createNewVersion('tpl_001', dto, userOwnership)).toThrow(ForbiddenException);
      expect(service.createNewVersion).not.toHaveBeenCalled();
    });

    it('admin calling createNewVersion → calls service.createNewVersion', async () => {
      const result = await controller.createNewVersion('tpl_001', dto, adminOwnership);
      expect(service.createNewVersion).toHaveBeenCalledWith('tpl_001', dto);
      expect(result).toEqual(mockTemplate);
    });
  });

  // ─── DELETE /templates/:id ──────────────────────────────────────────────────

  describe('remove (DELETE /templates/:id)', () => {
    it('non-admin calling remove → throws ForbiddenException', () => {
      expect(() => controller.remove('tpl_001', userOwnership)).toThrow(ForbiddenException);
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('admin calling remove → calls service.remove', async () => {
      await controller.remove('tpl_001', adminOwnership);
      expect(service.remove).toHaveBeenCalledWith('tpl_001');
    });
  });
});
