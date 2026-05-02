import { WorkflowTriggersService } from './workflow-triggers.service';

describe('WorkflowTriggersService', () => {
  const prisma = {
    materialBatch: {
      findUnique: jest.fn(),
    },
    nonConformance: {
      count: jest.fn(),
      create: jest.fn(),
    },
    changeComplianceRecord: {
      create: jest.fn(),
    },
  };
  const numberSequence = {
    generateNonConformanceNo: jest.fn(),
  };

  let service: WorkflowTriggersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowTriggersService(prisma as any, numberSequence as any);
  });

  it('does not create a NonConformance for passing incoming inspections', async () => {
    await service.handleInspectionFail({
      id: 'inspection-1',
      overall_result: 'pass',
      material_batch_id: 'mb1',
      company_id: '2',
    });

    expect(prisma.materialBatch.findUnique).not.toHaveBeenCalled();
    expect(numberSequence.generateNonConformanceNo).not.toHaveBeenCalled();
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('does not create a NonConformance when the material batch source is missing', async () => {
    prisma.materialBatch.findUnique.mockResolvedValue(null);

    await service.handleInspectionFail({
      id: 'inspection-2',
      overall_result: 'fail',
      material_batch_id: 'missing-mb',
      company_id: '2',
    });

    expect(prisma.materialBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-mb' },
      select: { id: true },
    });
    expect(numberSequence.generateNonConformanceNo).not.toHaveBeenCalled();
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('creates a NonConformance with shared sequence when a failed inspection has a valid material batch', async () => {
    prisma.materialBatch.findUnique.mockResolvedValue({ id: 'mb1' });
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0031');
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc-auto-1' });

    await service.handleInspectionFail({
      id: 'inspection-3',
      overall_result: 'fail',
      material_batch_id: 'mb1',
      company_id: '2',
    });

    expect(prisma.materialBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'mb1' },
      select: { id: true },
    });
    expect(prisma.nonConformance.count).not.toHaveBeenCalled();
    expect(numberSequence.generateNonConformanceNo).toHaveBeenCalledWith('2');
    expect(prisma.nonConformance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: '2',
        nc_no: 'NC-2026-0031',
        source_type: 'material_batch',
        source_id: 'mb1',
        status: 'open',
        description: expect.stringContaining('inspection-3'),
        discovered_at: expect.any(Date),
      }),
    });
  });
});
