import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateApprovalDefinitionDto } from './approval-definition.dto';

async function errs(payload: any) {
  const dto = plainToInstance(CreateApprovalDefinitionDto, payload);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('CreateApprovalDefinitionDto', () => {
  const valid = {
    module: 'document', resourceType: 'document', triggerKey: 'k', name: 'x', version: 1,
    steps: [{
      stepKey: 's1', stepName: 'n', mode: 'single',
      assignments: [{ type: 'ROLE', roleCode: 'leader' }],
    }],
  };

  it('accepts USER / ROLE / DEPARTMENT_ROLE assignments', async () => {
    expect((await errs(valid)).length).toBe(0);
  });

  it('rejects permission-typed assignments', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], assignments: [{ type: 'permission', permissionCode: 'x' }] }],
    });
    expect(e.length).toBeGreaterThan(0);
  });

  it('rejects unknown roleCode', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], assignments: [{ type: 'ROLE', roleCode: 'quality_manager' }] }],
    });
    expect(e.length).toBeGreaterThan(0);
  });

  it('rejects user without userId', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], assignments: [{ type: 'USER' }] }],
    });
    expect(e.length).toBeGreaterThan(0);
  });

  it('rejects department-role without departmentId', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], assignments: [{ type: 'DEPARTMENT_ROLE', roleCode: 'leader' }] }],
    });
    expect(e.length).toBeGreaterThan(0);
  });

  it('rejects disabled_legacy from user input', async () => {
    const e = await errs({ ...valid, status: 'disabled_legacy' });
    expect(e.length).toBeGreaterThan(0);
  });

  it('accepts StepDto with onRejected and dueHours', async () => {
    const e = await errs({
      ...valid,
      steps: [{
        ...valid.steps[0],
        onRejected: 'rejected_callback',
        dueHours: 24,
      }],
    });
    expect(e.length).toBe(0);
  });

  it('accepts StepDto with onRejected only (no dueHours)', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], onRejected: 'some_action' }],
    });
    expect(e.length).toBe(0);
  });

  it('accepts StepDto with dueHours 0 (boundary)', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], dueHours: 0 }],
    });
    expect(e.length).toBe(0);
  });

  it('rejects negative dueHours', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], dueHours: -1 }],
    });
    expect(e.length).toBeGreaterThan(0);
  });
});
