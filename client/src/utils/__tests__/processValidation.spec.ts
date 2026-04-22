import { describe, expect, it } from 'vitest';
import {
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

  it('Step5 through Step8 reject incomplete submit data', () => {
    expect(validateStep5({ productionLine: '', output: 0, trialRecord: '', processParams: {}, verificationConclusion: '' }).valid).toBe(false);
    expect(validateStep6({ materialConclusion: '', physicoChemical: '', shelfLifeTest: '', finalInspection: '', inspectionMethod: '' }).valid).toBe(false);
    expect(validateStep7({ verificationDate: '', onSiteProcess: '', potentialHazard: '', bioHazard: '', chemHazard: '', physHazard: '', allergenHazard: '', controlMeasure: '' }).valid).toBe(false);
    expect(validateStep8({ formulaConfirm: '', processConfirm: '', standardConfirm: '', shelfLifeVerify: '', inspectionReport: '', hazardAssessment: '', labelConfirm: '', packagingConfirm: '', conclusion: '' }).valid).toBe(false);
  });
});
