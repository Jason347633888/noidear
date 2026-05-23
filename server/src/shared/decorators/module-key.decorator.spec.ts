import { Reflector } from '@nestjs/core';
import { ModuleKey, MODULE_KEY_METADATA, getModuleKey } from './module-key.decorator';

describe('@ModuleKey', () => {
  it('attaches the module key as metadata', () => {
    @ModuleKey('warehouse')
    class FakeController {}
    const reflector = new Reflector();
    expect(reflector.get(MODULE_KEY_METADATA, FakeController)).toBe('warehouse');
    expect(getModuleKey(reflector, FakeController)).toBe('warehouse');
  });
});
