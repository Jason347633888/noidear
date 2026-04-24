import { Test } from '@nestjs/testing';
import { ModelLandingController } from './model-landing.controller';
import { ModelLandingService } from './model-landing.service';

describe('ModelLandingController', () => {
  it('wires summary and lookup endpoints to the service', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ModelLandingController],
      providers: [
        {
          provide: ModelLandingService,
          useValue: {
            getSummary: jest.fn().mockReturnValue({ totalForms: 283, totalGroups: 59, unmappedCount: 0 }),
            listGroups: jest.fn().mockReturnValue([{ id: 'FG-master-product-01', count: 2 }]),
            getGroup: jest.fn().mockReturnValue({ id: 'FG-master-product-01', count: 2, forms: [] }),
            getFormByCode: jest.fn().mockReturnValue({ code: 'GRSS-KF-JL-05', formName: '产品规格书' }),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(ModelLandingController);

    expect(controller.getSummary()).toEqual({ totalForms: 283, totalGroups: 59, unmappedCount: 0 });
    expect(controller.listGroups()).toEqual([{ id: 'FG-master-product-01', count: 2 }]);
    expect(controller.getGroup('FG-master-product-01')).toEqual({ id: 'FG-master-product-01', count: 2, forms: [] });
    expect(controller.getForm('GRSS-KF-JL-05')).toEqual({ code: 'GRSS-KF-JL-05', formName: '产品规格书' });
  });
});
