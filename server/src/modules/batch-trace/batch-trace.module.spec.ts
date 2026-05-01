import { MODULE_METADATA } from '@nestjs/common/constants';
import { BatchTraceModule } from './batch-trace.module';
import { TraceExportController } from './controllers/trace-export.controller';

describe('BatchTraceModule', () => {
  it('keeps trace export controller registered', () => {
    const metadata = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, BatchTraceModule) ?? [];

    expect(metadata).toContain(TraceExportController);
  });

  it('does not register deprecated backward/forward trace controller', () => {
    const metadata = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, BatchTraceModule) ?? [];
    const controllerNames = metadata.map((controller: Function) => controller.name);

    expect(controllerNames).not.toContain('TraceController');
  });
});
