import { ExecutionContext } from '@nestjs/common';
import { Ownership } from './ownership.decorator';

it('@Ownership() pulls request.ownership', () => {
  const exec = {
    switchToHttp: () => ({
      getRequest: () => ({
        ownership: { userId: 'u', roleCode: 'leader', managedDepartmentIds: ['d-1'] },
      }),
    }),
  } as ExecutionContext;

  const factory = (Ownership as any).__factory;
  expect(factory(undefined, exec)).toEqual({
    userId: 'u',
    roleCode: 'leader',
    managedDepartmentIds: ['d-1'],
  });
});
