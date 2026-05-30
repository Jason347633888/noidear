import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { CreateNcDto, NC_SOURCE_ITEM_TABLE, NC_SOURCE_TYPES } from './dto/create-nc.dto';
import { NonConformanceService } from './non-conformance.service';

describe('NonConformanceService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    nonConformance: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    materialBatch: {
      findUnique: jest.fn(),
    },
    productionBatch: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    reworkRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    inspectionRecord: {
      findUnique: jest.fn(),
    },
    inspectionRecordItem: {
      findUnique: jest.fn(),
    },
    maintenanceRecord: {
      findUnique: jest.fn(),
    },
    maintenanceRecordItem: {
      findUnique: jest.fn(),
    },
    laundryWorkRecord: {
      findUnique: jest.fn(),
    },
    laundryWorkRecordItem: {
      findUnique: jest.fn(),
    },
  };
  const numberSequence = {
    generateNonConformanceNo: jest.fn(),
  };
  prisma.$transaction = jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma));
  let service: NonConformanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NonConformanceService(prisma as any, numberSequence as any);
  });

  it('validates source and uses shared sequence service for NC numbering', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'b1', productId: 'prod-1', deletedAt: null });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0004');
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc1' });

    await service.create({ source_type: 'production_batch', source_id: 'b1', description: '偏差' }, 'u1', '2');

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'b1' },
      select: { id: true, productId: true, deletedAt: true },
    });
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-1', company_id: '2', deleted_at: null },
      select: { id: true },
    });
    expect(prisma.nonConformance.count).not.toHaveBeenCalled();
    expect(numberSequence.generateNonConformanceNo).toHaveBeenCalledWith('2');
    expect(prisma.nonConformance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          nc_no: 'NC-2026-0004',
          discovered_by: 'u1',
        }),
      }),
    );
  });

  it('rejects unsupported source_type before creating a record', async () => {
    await expect(
      service.create({ source_type: 'unknown', source_id: 'x1', description: '偏差' } as any, 'u1', '2'),
    ).rejects.toThrow('不支持的不合格来源类型');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects blank source_id before creating a record', async () => {
    await expect(
      service.create({ source_type: 'production_batch', source_id: ' ', description: '偏差' }, 'u1', '2'),
    ).rejects.toThrow('不合格来源不能为空');

    expect(prisma.productionBatch.findUnique).not.toHaveBeenCalled();
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects empty-string source_item_id at the DTO validation layer', async () => {
    // @IsNotEmpty() on source_item_id ensures "" fails class-validator before reaching the service.
    // Without it, "" is falsy so `if (sourceItemId)` skips the child-item check, and "" gets
    // persisted to the DB. This test confirms the decorator rejects empty strings.
    const dto = Object.assign(new CreateNcDto(), {
      source_type: 'inspection_record',
      source_id: 'ir-1',
      source_item_id: '',
      description: '空字符串 source_item_id 不应通过验证',
    });

    const errors = await validate(dto);

    const sourceItemIdErrors = errors.filter((e) => e.property === 'source_item_id');
    expect(sourceItemIdErrors.length).toBeGreaterThan(0);
    expect(Object.keys(sourceItemIdErrors[0].constraints ?? {})).toContain('isNotEmpty');
  });

  it('rejects a missing production batch source', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ source_type: 'production_batch', source_id: 'missing-batch', description: '偏差' }, 'u1', '2'),
    ).rejects.toThrow('生产批次来源不存在');

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-batch' },
      select: { id: true, productId: true, deletedAt: true },
    });
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects a production batch source outside the current company', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'other-company-batch', productId: 'prod-other', deletedAt: null });
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.create({ source_type: 'production_batch', source_id: 'other-company-batch', description: '偏差' }, 'u1', '2'),
    ).rejects.toThrow('生产批次来源不存在');

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'other-company-batch' },
      select: { id: true, productId: true, deletedAt: true },
    });
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-other', company_id: '2', deleted_at: null },
      select: { id: true },
    });
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects a missing material batch source', async () => {
    prisma.materialBatch.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ source_type: 'material_batch', source_id: 'missing-material-batch', description: '偏差' }, 'u1', '2'),
    ).rejects.toThrow('物料批次来源不存在');

    expect(prisma.materialBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-material-batch' },
      select: { id: true, deletedAt: true },
    });
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects a product source outside the current company', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.create({ source_type: 'product', source_id: 'product-1', description: '偏差' }, 'u1', '2'),
    ).rejects.toThrow('产品来源不存在');

    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'product-1', company_id: '2', deleted_at: null },
      select: { id: true },
    });
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('allows a valid material batch source', async () => {
    prisma.materialBatch.findUnique.mockResolvedValue({ id: 'mb1' });
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0001');
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc-material' });

    await service.create({ source_type: 'material_batch', source_id: 'mb1', description: '来料不合格' }, 'u1', '2');

    expect(prisma.materialBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'mb1' },
      select: { id: true, deletedAt: true },
    });
    expect(prisma.nonConformance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source_type: 'material_batch',
          source_id: 'mb1',
          company_id: '2',
        }),
      }),
    );
  });

  it('blocks dispose when record is outside current company', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue(null);

    await expect(service.dispose('nc1', { disposition: 'rework' }, 'u1', '2')).rejects.toThrow(NotFoundException);
    expect(prisma.nonConformance.update).not.toHaveBeenCalled();
  });

  it('auto-creates one pending ReworkRecord when disposing a production-batch NC as rework', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      company_id: '2',
      nc_no: 'NC-2026-0001',
      source_type: 'production_batch',
      source_id: 'batch-1',
      description: '烘烤不足，需要返工',
      qty: 12.5,
      unit: 'kg',
    });
    prisma.productionBatch.findFirst.mockResolvedValue({ id: 'batch-1' });
    prisma.reworkRecord.findFirst.mockResolvedValue(null);
    prisma.nonConformance.update.mockResolvedValue({ id: 'nc1', disposition: 'rework' });
    prisma.reworkRecord.create.mockResolvedValue({ id: 'rw1' });

    await service.dispose('nc1', { disposition: 'rework' }, 'u1', '2');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.productionBatch.findFirst).toHaveBeenCalledWith({
      where: { id: 'batch-1', product: { company_id: '2' } },
      select: { id: true },
    });
    expect(prisma.reworkRecord.findFirst).toHaveBeenCalledWith({
      where: { company_id: '2', nc_id: 'nc1' },
      select: { id: true },
    });
    expect(prisma.reworkRecord.create).toHaveBeenCalledWith({
      data: {
        company_id: '2',
        production_batch_id: 'batch-1',
        nc_id: 'nc1',
        rework_reason: '烘烤不足，需要返工',
        rework_qty: 12.5,
        unit: 'kg',
        rework_date: expect.any(Date),
        operator_id: 'u1',
        quality_verdict: 'pending',
      },
    });
    expect(prisma.nonConformance.update).toHaveBeenCalledWith({
      where: { id: 'nc1' },
      data: {
        disposition: 'rework',
        disposition_by: 'u1',
        disposition_at: expect.any(Date),
        status: 'dispositioned',
      },
    });
  });

  it('does not create a duplicate ReworkRecord when one already exists for the NC', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      company_id: '2',
      nc_no: 'NC-2026-0001',
      source_type: 'production_batch',
      source_id: 'batch-1',
      description: '烘烤不足，需要返工',
      qty: 12.5,
      unit: 'kg',
    });
    prisma.productionBatch.findFirst.mockResolvedValue({ id: 'batch-1' });
    prisma.reworkRecord.findFirst.mockResolvedValue({ id: 'rw-existing' });
    prisma.nonConformance.update.mockResolvedValue({ id: 'nc1', disposition: 'rework' });

    await service.dispose('nc1', { disposition: 'rework' }, 'u1', '2');

    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
    expect(prisma.nonConformance.update).toHaveBeenCalled();
  });

  it('rejects rework disposition when NC source is not a production batch', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc-material',
      company_id: '2',
      source_type: 'material_batch',
      source_id: 'material-batch-1',
      description: '原料异常',
      qty: 1,
      unit: 'kg',
    });

    await expect(service.dispose('nc-material', { disposition: 'rework' }, 'u1', '2')).rejects.toThrow(
      '返工处置仅支持来源为生产批次的不合格记录',
    );

    expect(prisma.nonConformance.update).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });

  it('rejects rework disposition when NC quantity or unit is missing', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc-no-qty',
      company_id: '2',
      source_type: 'production_batch',
      source_id: 'batch-1',
      description: '未填写数量',
      qty: null,
      unit: 'kg',
    });

    await expect(service.dispose('nc-no-qty', { disposition: 'rework' }, 'u1', '2')).rejects.toThrow(
      '返工处置需要不合格数量和单位',
    );

    expect(prisma.productionBatch.findFirst).not.toHaveBeenCalled();
    expect(prisma.nonConformance.update).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });

  it('rejects rework disposition when the production batch is missing or outside company', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      company_id: '2',
      source_type: 'production_batch',
      source_id: 'missing-batch',
      description: '批次不存在',
      qty: 1,
      unit: 'kg',
    });
    prisma.productionBatch.findFirst.mockResolvedValue(null);

    await expect(service.dispose('nc1', { disposition: 'rework' }, 'u1', '2')).rejects.toThrow(
      '返工处置的生产批次不存在或不属于当前公司',
    );

    expect(prisma.nonConformance.update).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });

  it('does not touch ReworkRecord when disposition is not rework', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      company_id: '2',
      source_type: 'production_batch',
      source_id: 'batch-1',
      description: '让步接收',
      qty: 1,
      unit: 'kg',
    });
    prisma.nonConformance.update.mockResolvedValue({ id: 'nc1', disposition: 'concession' });

    await service.dispose('nc1', { disposition: 'concession' }, 'u1', '2');

    expect(prisma.productionBatch.findFirst).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.findFirst).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
    expect(prisma.nonConformance.update).toHaveBeenCalledWith({
      where: { id: 'nc1' },
      data: {
        disposition: 'concession',
        disposition_by: 'u1',
        disposition_at: expect.any(Date),
        status: 'dispositioned',
      },
    });
  });

  it('creates an open NonConformance from a CCP deviation using production batch as source', async () => {
    const tx: any = {
      nonConformance: {
        count: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'nc-ccp-1' }),
      },
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1', productId: 'prod-1', deletedAt: null }),
      },
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 'prod-1' }),
      },
    };
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0022');

    await service.createFromCcpDeviation(
      {
        companyId: '2',
        userId: 'operator-1',
        ccpRecord: {
          id: 'ccp-record-1',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-1',
          measured_value: 93.5,
          measured_text: null,
          unit: 'C',
          deviation_action: '隔离待评审',
          ccp_point: { ccp_no: 'CCP-BAKE-01' },
        },
      },
      tx,
    );

    expect(tx.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      select: { id: true, productId: true, deletedAt: true },
    });
    expect(tx.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-1', company_id: '2', deleted_at: null },
      select: { id: true },
    });
    expect(tx.nonConformance.count).not.toHaveBeenCalled();
    expect(numberSequence.generateNonConformanceNo).toHaveBeenCalledWith('2', expect.any(Date), tx);
    expect(tx.nonConformance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: '2',
        nc_no: 'NC-2026-0022',
        source_type: 'production_batch',
        source_id: 'batch-1',
        nc_type: 'ccp_deviation',
        discovered_by: 'operator-1',
        discovered_at: expect.any(Date),
        description: expect.stringContaining('CCP-BAKE-01'),
      }),
    });
    expect(tx.nonConformance.create.mock.calls[0][0].data.description).toContain('93.5 C');
    expect(tx.nonConformance.create.mock.calls[0][0].data.description).toContain('隔离待评审');
    expect(tx.nonConformance.create.mock.calls[0][0].data.description).toContain('ccp-record-1');
  });

  it('builds a CCP deviation description from measured text when numeric value is absent', async () => {
    const tx: any = {
      nonConformance: {
        count: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'nc-ccp-2' }),
      },
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1', productId: 'prod-1', deletedAt: null }),
      },
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 'prod-1' }),
      },
    };
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0001');

    await service.createFromCcpDeviation(
      {
        companyId: '2',
        userId: 'operator-1',
        ccpRecord: {
          id: 'ccp-record-2',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-2',
          measured_value: null,
          measured_text: '金探测试片未通过',
          unit: null,
          deviation_action: null,
          ccp_point: null,
        },
      },
      tx,
    );

    expect(tx.nonConformance.count).not.toHaveBeenCalled();
    const data = tx.nonConformance.create.mock.calls[0][0].data;
    expect(data.description).toContain('ccp-point-2');
    expect(data.description).toContain('金探测试片未通过');
    expect(data.description).toContain('未填写');
  });

  it('rejects a soft-deleted material batch as NC source', async () => {
    prisma.materialBatch.findUnique.mockResolvedValue({ id: 'mb-deleted', deletedAt: new Date('2025-01-01') });

    await expect(
      service.create({ source_type: 'material_batch', source_id: 'mb-deleted', description: '来料不合格' }, 'u1', '2'),
    ).rejects.toThrow('物料批次来源不存在');

    expect(prisma.materialBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'mb-deleted' },
      select: { id: true, deletedAt: true },
    });
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects a soft-deleted production batch as NC source', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({
      id: 'pb-deleted',
      productId: 'prod-1',
      deletedAt: new Date('2025-01-01'),
    });

    await expect(
      service.create({ source_type: 'production_batch', source_id: 'pb-deleted', description: '偏差' }, 'u1', '2'),
    ).rejects.toThrow('生产批次来源不存在');

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'pb-deleted' },
      select: { id: true, productId: true, deletedAt: true },
    });
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  // ─── Source-type contract tests ──────────────────────────────────────────

  it('NC_SOURCE_TYPES contains all required source types', () => {
    const required = [
      'material_batch',
      'production_batch',
      'product',
      'inspection_record',
      'sanitizer_concentration_check',
      'cleaning_record',
      'calibration_record',
      'maintenance_record',
      'metal_detection_log',
      'laundry_work_record',
    ] as const;
    for (const t of required) {
      expect(NC_SOURCE_TYPES).toContain(t);
    }
  });

  it('NC_SOURCE_ITEM_TABLE maps child-detail sources to the correct table names', () => {
    expect(NC_SOURCE_ITEM_TABLE['inspection_record']).toBe('InspectionRecordItem');
    expect(NC_SOURCE_ITEM_TABLE['cleaning_record']).toBe('CleaningRecordItem');
    expect(NC_SOURCE_ITEM_TABLE['calibration_record']).toBe('CalibrationPointReading');
    expect(NC_SOURCE_ITEM_TABLE['maintenance_record']).toBe('MaintenanceRecordItem');
    expect(NC_SOURCE_ITEM_TABLE['laundry_work_record']).toBe('LaundryWorkRecordItem');
    // Sources that have no detail row must NOT appear in the map
    expect(NC_SOURCE_ITEM_TABLE['material_batch']).toBeUndefined();
    expect(NC_SOURCE_ITEM_TABLE['production_batch']).toBeUndefined();
    expect(NC_SOURCE_ITEM_TABLE['product']).toBeUndefined();
    expect(NC_SOURCE_ITEM_TABLE['sanitizer_concentration_check']).toBeUndefined();
    expect(NC_SOURCE_ITEM_TABLE['metal_detection_log']).toBeUndefined();
  });

  it('accepts inspection_record source with valid source_id and source_item_id', async () => {
    prisma.inspectionRecord.findUnique.mockResolvedValue({ id: 'ir-1', company_id: '2' });
    prisma.inspectionRecordItem.findUnique.mockResolvedValue({ id: 'iri-1', record_id: 'ir-1' });
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0010');
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc-ir-1' });

    await service.create(
      {
        source_type: 'inspection_record',
        source_id: 'ir-1',
        source_item_id: 'iri-1',
        description: '检验项目不合格',
      },
      'u1',
      '2',
    );

    expect(prisma.inspectionRecord.findUnique).toHaveBeenCalledWith({
      where: { id: 'ir-1' },
      select: { id: true, company_id: true },
    });
    expect(prisma.inspectionRecordItem.findUnique).toHaveBeenCalledWith({
      where: { id: 'iri-1' },
      select: { id: true, record_id: true },
    });
    expect(prisma.nonConformance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source_type: 'inspection_record',
          source_id: 'ir-1',
          source_item_id: 'iri-1',
          company_id: '2',
        }),
      }),
    );
  });

  it('rejects inspection_record source when the record does not exist', async () => {
    prisma.inspectionRecord.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        { source_type: 'inspection_record', source_id: 'ir-missing', description: '来源不存在' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('检验记录来源不存在');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects inspection_record source when the record belongs to another company', async () => {
    prisma.inspectionRecord.findUnique.mockResolvedValue({ id: 'ir-1', company_id: 'other-company' });

    await expect(
      service.create(
        { source_type: 'inspection_record', source_id: 'ir-1', description: '跨公司' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('检验记录来源不存在');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects inspection_record source when source_item_id provided but item does not exist', async () => {
    prisma.inspectionRecord.findUnique.mockResolvedValue({ id: 'ir-1', company_id: '2' });
    prisma.inspectionRecordItem.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          source_type: 'inspection_record',
          source_id: 'ir-1',
          source_item_id: 'iri-missing',
          description: '子项不存在',
        },
        'u1',
        '2',
      ),
    ).rejects.toThrow('检验记录子项不存在');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects inspection_record source when source_item_id belongs to a different inspection record', async () => {
    prisma.inspectionRecord.findUnique.mockResolvedValue({ id: 'ir-1', company_id: '2' });
    prisma.inspectionRecordItem.findUnique.mockResolvedValue({ id: 'iri-1', record_id: 'ir-OTHER' });

    await expect(
      service.create(
        {
          source_type: 'inspection_record',
          source_id: 'ir-1',
          source_item_id: 'iri-1',
          description: '子项不属于该记录',
        },
        'u1',
        '2',
      ),
    ).rejects.toThrow('检验记录子项不存在');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects metal_detection_log when record does not exist', async () => {
    prisma.metalDetectionLog = { count: jest.fn().mockResolvedValue(0) };

    await expect(
      service.create({ source_type: 'metal_detection_log', source_id: 'any-id', description: '测试' }, 'u1', '2'),
    ).rejects.toThrow('金属探测记录来源不存在');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  // ─── laundry_work_record source-type contract (Phase 15 Task 7) ─────────────

  it('accepts laundry_work_record source when company_id matches', async () => {
    prisma.laundryWorkRecord.findUnique.mockResolvedValue({ id: 'lwr-1', company_id: '2' });
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0060');
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc-lwr-1' });

    await service.create(
      { source_type: 'laundry_work_record', source_id: 'lwr-1', description: '洗涤不合格' },
      'u1',
      '2',
    );

    expect(prisma.laundryWorkRecord.findUnique).toHaveBeenCalledWith({
      where: { id: 'lwr-1' },
      select: { id: true, company_id: true },
    });
    expect(prisma.nonConformance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source_type: 'laundry_work_record',
          source_id: 'lwr-1',
          company_id: '2',
        }),
      }),
    );
  });

  it('rejects laundry_work_record when record does not exist', async () => {
    prisma.laundryWorkRecord.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        { source_type: 'laundry_work_record', source_id: 'lwr-missing', description: '来源不存在' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('洗涤工作记录来源不存在');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects laundry_work_record when source_item_id does not belong to the record', async () => {
    prisma.laundryWorkRecord.findUnique.mockResolvedValue({ id: 'lwr-1', company_id: '2' });
    prisma.laundryWorkRecordItem.findUnique.mockResolvedValue({
      id: 'item-2',
      laundry_work_record_id: 'different-record',
    });

    await expect(
      service.create(
        {
          source_type: 'laundry_work_record',
          source_id: 'lwr-1',
          source_item_id: 'item-2',
          description: '子项不属于该记录',
        },
        'u1',
        '2',
      ),
    ).rejects.toThrow('洗涤工作记录子项不存在');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  // ─── maintenance_record source-type contract (T5-2) ─────────────────────

  it('accepts maintenance_record source when company_id matches', async () => {
    prisma.maintenanceRecord.findUnique.mockResolvedValue({ id: 'mr-1', company_id: '2' });
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0050');
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc-mr-1' });

    await service.create(
      { source_type: 'maintenance_record', source_id: 'mr-1', description: '维保项不合格' },
      'u1',
      '2',
    );

    expect(prisma.maintenanceRecord.findUnique).toHaveBeenCalledWith({
      where: { id: 'mr-1' },
      select: { id: true, company_id: true },
    });
    expect(prisma.nonConformance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source_type: 'maintenance_record',
          source_id: 'mr-1',
          company_id: '2',
        }),
      }),
    );
  });

  it('rejects maintenance_record source when record does not exist', async () => {
    prisma.maintenanceRecord.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        { source_type: 'maintenance_record', source_id: 'mr-missing', description: '来源不存在' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('维保记录来源不存在');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects maintenance_record source when record belongs to another tenant (T5-2 cross-tenant leak fix)', async () => {
    prisma.maintenanceRecord.findUnique.mockResolvedValue({ id: 'mr-other', company_id: 'tenant-other' });

    await expect(
      service.create(
        { source_type: 'maintenance_record', source_id: 'mr-other', description: '跨租户' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('维保记录来源不存在');

    expect(prisma.maintenanceRecord.findUnique).toHaveBeenCalledWith({
      where: { id: 'mr-other' },
      select: { id: true, company_id: true },
    });
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('accepts maintenance_record source with valid source_item_id', async () => {
    prisma.maintenanceRecord.findUnique.mockResolvedValue({ id: 'mr-1', company_id: '2' });
    prisma.maintenanceRecordItem.findUnique.mockResolvedValue({ id: 'mri-1', maintenanceRecordId: 'mr-1' });
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0051');
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc-mr-2' });

    await service.create(
      {
        source_type: 'maintenance_record',
        source_id: 'mr-1',
        source_item_id: 'mri-1',
        description: '维保检查项不合格',
      },
      'u1',
      '2',
    );

    expect(prisma.maintenanceRecordItem.findUnique).toHaveBeenCalledWith({
      where: { id: 'mri-1' },
      select: { id: true, maintenanceRecordId: true },
    });
    expect(prisma.nonConformance.create).toHaveBeenCalled();
  });

  it('rejects maintenance_record source when source_item_id belongs to different record', async () => {
    prisma.maintenanceRecord.findUnique.mockResolvedValue({ id: 'mr-1', company_id: '2' });
    prisma.maintenanceRecordItem.findUnique.mockResolvedValue({ id: 'mri-1', maintenanceRecordId: 'mr-OTHER' });

    await expect(
      service.create(
        {
          source_type: 'maintenance_record',
          source_id: 'mr-1',
          source_item_id: 'mri-1',
          description: '子项不属于该记录',
        },
        'u1',
        '2',
      ),
    ).rejects.toThrow('维保记录检查项不存在');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects CCP deviation NonConformance creation when the production batch belongs to another company', async () => {
    const tx: any = {
      nonConformance: {
        count: jest.fn(),
        create: jest.fn(),
      },
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-other', productId: 'prod-other', deletedAt: null }),
      },
      product: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    await expect(
      service.createFromCcpDeviation(
        {
          companyId: '2',
          userId: 'operator-1',
          ccpRecord: {
            id: 'ccp-record-1',
            production_batch_id: 'batch-other',
            ccp_point_id: 'ccp-point-1',
            measured_value: 93.5,
            measured_text: null,
            unit: 'C',
            deviation_action: '隔离待评审',
            ccp_point: { ccp_no: 'CCP-BAKE-01' },
          },
        },
        tx,
      ),
    ).rejects.toThrow('生产批次来源不存在');

    expect(tx.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'batch-other' },
      select: { id: true, productId: true, deletedAt: true },
    });
    expect(tx.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-other', company_id: '2', deleted_at: null },
      select: { id: true },
    });
    expect(tx.nonConformance.count).not.toHaveBeenCalled();
    expect(tx.nonConformance.create).not.toHaveBeenCalled();
  });
});
