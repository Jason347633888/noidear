import { WorkflowTriggersService } from './workflow-triggers.service';

describe('WorkflowTriggersService', () => {
  const prisma = {
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

  it('creates incoming-inspection failure NC with the shared sequence', async () => {
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0031');
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc-incoming-1' });

    await service.handleInspectionFail({
      id: 'inspection-1',
      overall_result: 'fail',
      material_batch_id: 'mb-1',
      company_id: 'company-1',
    });

    expect(prisma.nonConformance.count).not.toHaveBeenCalled();
    expect(numberSequence.generateNonConformanceNo).toHaveBeenCalledWith('company-1');
    expect(prisma.nonConformance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: 'company-1',
        nc_no: 'NC-2026-0031',
        source_type: 'material_batch',
        source_id: 'mb-1',
        status: 'open',
        description: expect.stringContaining('inspection-1'),
      }),
    });
  });

  it('does not create NC when incoming inspection passes', async () => {
    await service.handleInspectionFail({
      id: 'inspection-2',
      overall_result: 'pass',
      material_batch_id: 'mb-1',
      company_id: 'company-1',
    });

    expect(numberSequence.generateNonConformanceNo).not.toHaveBeenCalled();
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });
});
