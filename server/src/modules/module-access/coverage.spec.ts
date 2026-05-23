import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { ModuleRouteRegistry } from './module-route-registry';
import { REGISTRY_CONFIG } from './registry-config';

it('every controller path is covered by REGISTRY_CONFIG', async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication();
  await app.init();
  const container = (app as any).container;
  const paths: string[] = [];
  container.getModules().forEach((m: any) =>
    m.controllers.forEach((wrapper: any) => {
      const p = Reflect.getMetadata('path', wrapper.metatype);
      if (typeof p === 'string') paths.push(p);
    }),
  );
  const registry = new ModuleRouteRegistry(REGISTRY_CONFIG);
  expect(() => registry.validate(paths, { strict: true })).not.toThrow();
  await app.close();
}, 30000);
