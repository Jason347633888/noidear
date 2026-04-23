import { describe, expect, it } from 'vitest';
import {
  firstValidationMessage,
  validateStep1,
  validateStep2,
  validateStep4,
  validateStep5,
  validateStep6,
  validateStep7,
  validateStep8,
} from '../processValidation';

describe('process validation helpers', () => {
  it('Step1 requires the visible source-form fields used by the page', () => {
    const result = validateStep1({
      applicant: '',
      flavorRequirement: '',
      pesticideRequirement: '',
      heavyMetalRequirement: '',
      microbiologicalRequirement: '',
      standardRequirement: '',
      labelRequirement: '',
      nutritionRequirement: '',
      submitDate: '',
      productName: '',
      processType: '',
      shelfLife: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('productName');
    expect(result.errors.map((e) => e.fieldKey)).toContain('submitDate');
    expect(result.errors.map((e) => e.fieldKey)).toContain('shelfLife');
  });

  it('firstValidationMessage returns the first validation error message', () => {
    const result = validateStep1({
      applicant: '',
      flavorRequirement: '',
      pesticideRequirement: '',
      heavyMetalRequirement: '',
      microbiologicalRequirement: '',
      standardRequirement: '',
      labelRequirement: '',
      nutritionRequirement: '',
      submitDate: '',
      productName: '',
      processType: '',
      shelfLife: '',
    });

    expect(firstValidationMessage(result)).toBe('申请人不能为空');
  });

  it('Step2 requires raw material rows and standardOther when standard is other', () => {
    const result = validateStep2({
      rawMaterials: [{ materialCode: '', name: '鸡蛋', ingredientInfo: '' }],
      packagingForm: '',
      storageCondition: '',
      standard: '其他',
      standardOther: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('rawMaterials');
    expect(result.errors.map((e) => e.fieldKey)).toContain('standardOther');
  });

  it('Step4 requires batch number and complete ingredient rows', () => {
    const result = validateStep4({
      trialDate: '2026-04-22',
      batchNumber: '',
      ingredients: [{ name: '', weight: '' }],
      processParams: {},
      trialConclusion: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('batchNumber');
    expect(result.errors.some((e) => e.rowIndex === 0 && e.childKey === 'name')).toBe(true);
  });

  it('Step4 rejects empty process params', () => {
    const result = validateStep4({
      trialDate: '2026-04-22',
      batchNumber: 'B-001',
      ingredients: [{ name: '鸡蛋', weight: '10' }],
      processParams: {},
      trialConclusion: '合格',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('processParams');
  });

  it('Step4 accepts valid process params', () => {
    const result = validateStep4({
      trialDate: '2026-04-22',
      batchNumber: 'B-001',
      ingredients: [{ name: '鸡蛋', weight: '10' }],
      processParams: {
        batterTemp: 20,
        exitTemp: 180,
        packTemp: 25,
        ovenZones: { 一区: { topTemp: 180 } },
        fanDevices: [{ name: '风机', lowFreq: 10, highFreq: 20 }],
      },
      trialConclusion: '合格',
    });

    expect(result.valid).toBe(true);
  });

  it('Step5 rejects invalid process params with max violations', () => {
    const result = validateStep5({
      date: '2026-04-22',
      productionLine: '烤蛋糕1号线',
      output: 1,
      trialRecord: '记录',
      processParams: {
        exitTemp: 301,
        packTemp: 61,
        batterTemp: 20,
        ovenZones: { 一区: { topTemp: 180 } },
        fanDevices: [{ name: '风机', lowFreq: 10, highFreq: 20 }],
      },
      verificationConclusion: '合格',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('processParams');
    expect(result.errors.map((e) => e.message)).toContain('出炉中心温度不能大于300');
    expect(result.errors.map((e) => e.message)).toContain('包装中心温度不能大于60');
  });

  it('Step5 through Step8 reject incomplete submit data', () => {
    expect(validateStep5({ productionLine: '', output: 0, trialRecord: '', processParams: {}, verificationConclusion: '' }).valid).toBe(false);
    expect(validateStep6({ materialConclusion: '', physicoChemical: '', shelfLifeTest: '', finalInspection: '', inspectionMethod: '' }).valid).toBe(false);
    expect(validateStep7({ verificationDate: '', onSiteProcess: '', potentialHazard: '', bioHazard: '', chemHazard: '', physHazard: '', allergenHazard: '', controlMeasure: '' }).valid).toBe(false);
    expect(validateStep8({ formulaConfirm: '', processConfirm: '', standardConfirm: '', shelfLifeVerify: '', inspectionReport: '', hazardAssessment: '', labelConfirm: '', packagingConfirm: '', conclusion: '' }).valid).toBe(false);
  });

  it('Step5 through Step8 surface the first submit validation message', () => {
    expect(firstValidationMessage(validateStep5({ date: '2026-04-22', productionLine: '烤蛋糕1号线', output: 1, trialRecord: '记录', processParams: {}, verificationConclusion: '合格' }))).toBe('出炉中心温度不能为空');
    expect(firstValidationMessage(validateStep6({ cert3in1: false, thirdPartyTest: true, batchReport: true, hazardAnalysis: true, materialCompliant: true, materialConclusion: '可靠', physicoChemical: '符合理化要求(GRSS/PZ-JL-29)', shelfLifeTest: '符合保质期要求(GRSS/PZ-JL-62)', finalInspection: '合格', inspectionMethod: '型式检验' }))).toBe('原料生产商三证合一必须确认');
    expect(firstValidationMessage(validateStep7({ verificationDate: '2026-04-22', onSiteProcess: '符合标准', potentialHazard: '符合标准', bioHazard: '是', chemHazard: '是', physHazard: '是', allergenHazard: '是', controlMeasure: '已具备', ccpLimitOk: false, ccpMonitorOk: true, ccpDeviceOk: true, ccpPersonnelOk: true }))).toBe('关键限值符合工艺范围必须确认');
    expect(firstValidationMessage(validateStep8({ c1: false, c2: true, c3: true, c4: true, c5: true, c6: true, c7: true, c8: true, c9: true, c10: true, c11: true, c12: true, formulaConfirm: '已确认', processConfirm: '已确认', standardConfirm: '已确认', shelfLifeVerify: '完成', inspectionReport: '合格', hazardAssessment: '完成', labelConfirm: '合规', packagingConfirm: '合格', conclusion: '同意放行' }))).toBe('原辅料采购的可行性必须确认');
  });

  it('Step6 requires checklist confirmations', () => {
    const result = validateStep6({
      cert3in1: true,
      thirdPartyTest: false,
      batchReport: true,
      hazardAnalysis: true,
      materialCompliant: true,
      materialConclusion: '可靠',
      physicoChemical: '符合理化要求(GRSS/PZ-JL-29)',
      shelfLifeTest: '符合保质期要求(GRSS/PZ-JL-62)',
      finalInspection: '合格',
      inspectionMethod: '型式检验',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('thirdPartyTest');
  });

  it('Step7 requires CCP confirmations', () => {
    const result = validateStep7({
      verificationDate: '2026-04-22',
      onSiteProcess: '符合标准',
      potentialHazard: '符合标准',
      bioHazard: '是',
      chemHazard: '是',
      physHazard: '是',
      allergenHazard: '是',
      controlMeasure: '已具备',
      ccpLimitOk: false,
      ccpMonitorOk: true,
      ccpDeviceOk: true,
      ccpPersonnelOk: true,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('ccpLimitOk');
  });

  it('Step8 requires all review checkboxes', () => {
    const result = validateStep8({
      c1: true,
      c2: true,
      c3: false,
      c4: true,
      c5: true,
      c6: true,
      c7: true,
      c8: true,
      c9: true,
      c10: true,
      c11: true,
      c12: true,
      formulaConfirm: '已确认',
      processConfirm: '已确认',
      standardConfirm: '已确认',
      shelfLifeVerify: '完成',
      inspectionReport: '合格',
      hazardAssessment: '完成',
      labelConfirm: '合规',
      packagingConfirm: '合格',
      conclusion: '同意放行',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('c3');
  });
});
