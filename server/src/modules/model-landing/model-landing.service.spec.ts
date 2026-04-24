jest.mock('./generated/model-landing.generated', () => ({
  MODEL_LANDING_FORMS: [
    {
      templateGroupId: 'FG-master-product-01',
      code: 'GRSS-KF-JL-05',
      formName: '产品规格书',
      path: '产品开发部/产品规格书/产品规格书.md',
      department: '产品开发部',
      entities: ['Product', 'Recipe'],
      chain: '研发/变更',
      basis: 'test:fixture',
    },
  ],
  MODEL_LANDING_GROUPS: [{ id: 'FG-master-product-01', count: 1 }],
  MODEL_LANDING_SUMMARY: {
    totalForms: 1,
    totalGroups: 1,
    unmappedCount: 0,
    groupCounts: { 'FG-master-product-01': 1 },
  },
}));

import { ModelLandingService } from './model-landing.service';

describe('ModelLandingService', () => {
  it('returns summary and lookups from generated data', () => {
    const service = new ModelLandingService();

    expect(service.getSummary()).toEqual({
      totalForms: 1,
      totalGroups: 1,
      unmappedCount: 0,
      groupCounts: { 'FG-master-product-01': 1 },
    });

    expect(service.getFormByCode('GRSS-KF-JL-05')?.formName).toBe('产品规格书');
    expect(service.getGroup('FG-master-product-01')?.count).toBe(1);
  });
});
