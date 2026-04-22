import { validateFields } from './formValidation';
import type { FormValidationField, FormValidationResult } from './formValidation';

const requiredText = (name: string, label: string): FormValidationField => ({
  name,
  label,
  type: 'text',
  required: true,
});

const requiredNumber = (name: string, label: string, min = 0): FormValidationField => ({
  name,
  label,
  type: 'number',
  required: true,
  min,
});

export const validateStep1 = (values: Record<string, unknown>): FormValidationResult => validateFields(
  [
    requiredText('applicant', '申请人'),
    requiredText('flavorRequirement', '客户/风味需求或产品特性'),
    requiredText('pesticideRequirement', '农残要求'),
    requiredText('heavyMetalRequirement', '重金属要求'),
    requiredText('microbiologicalRequirement', '微生物要求'),
    requiredText('standardRequirement', '标准要求'),
    requiredText('labelRequirement', '标签要求'),
    requiredText('nutritionRequirement', '营养成分'),
    requiredText('submitDate', '申请日期'),
    requiredText('productName', '开发产品名称'),
    requiredText('processType', '工艺形式'),
    requiredText('shelfLife', '预期保质期'),
  ],
  values,
);

export const validateStep2 = (values: Record<string, unknown>): FormValidationResult => validateFields(
  [
    {
      name: 'rawMaterials',
      label: '原料清单',
      type: 'table-input',
      required: true,
      rowSchema: [
        requiredText('materialCode', '物料编码'),
        requiredText('name', '物料名称'),
        requiredText('ingredientInfo', '配料信息'),
      ],
    },
    requiredText('packagingForm', '包装形式'),
    requiredText('storageCondition', '储存条件'),
    requiredText('standard', '适用标准'),
    {
      ...requiredText('standardOther', '标准编号'),
      visibility: { field: 'standard', equals: '其他' },
    },
  ],
  values,
);

export const validateStep4 = (values: Record<string, unknown>): FormValidationResult => validateFields(
  [
    requiredText('trialDate', '试验日期'),
    requiredText('batchNumber', '生产批次'),
    {
      name: 'ingredients',
      label: '配料表',
      type: 'table-input',
      required: true,
      rowSchema: [
        requiredText('name', '配料名称'),
        requiredText('weight', '重量'),
      ],
    },
    requiredText('trialConclusion', '实验记录/结论'),
  ],
  values,
);

export const validateStep5 = (values: Record<string, unknown>): FormValidationResult => validateFields(
  [
    requiredText('date', '日期'),
    requiredText('productionLine', '生产线'),
    requiredNumber('output', '产量', 0.001),
    requiredText('trialRecord', '试验记录'),
    requiredText('verificationConclusion', '验证结论'),
  ],
  values,
);

export const validateStep6 = (values: Record<string, unknown>): FormValidationResult => validateFields(
  [
    requiredText('materialConclusion', '原辅料的质量与可靠性'),
    requiredText('physicoChemical', '产品理化及安全性检验'),
    requiredText('shelfLifeTest', '保质期测试'),
    requiredText('finalInspection', '成品检验'),
    requiredText('inspectionMethod', '检验方式'),
  ],
  values,
);

export const validateStep7 = (values: Record<string, unknown>): FormValidationResult => validateFields(
  [
    requiredText('verificationDate', '验证时间'),
    requiredText('onSiteProcess', '现场工艺'),
    requiredText('potentialHazard', '潜在危害'),
    requiredText('bioHazard', '生物危害'),
    requiredText('chemHazard', '化学危害'),
    requiredText('physHazard', '物理危害'),
    requiredText('allergenHazard', '过敏原'),
    requiredText('controlMeasure', '控制措施'),
  ],
  values,
);

export const validateStep8 = (values: Record<string, unknown>): FormValidationResult => validateFields(
  [
    requiredText('formulaConfirm', '配方确认'),
    requiredText('processConfirm', '工艺确认'),
    requiredText('standardConfirm', '标准确认'),
    requiredText('shelfLifeVerify', '保质期验证'),
    requiredText('inspectionReport', '检验报告'),
    requiredText('hazardAssessment', '危害评估'),
    requiredText('labelConfirm', '标签'),
    requiredText('packagingConfirm', '包装材料'),
    requiredText('conclusion', '结论'),
  ],
  values,
);

export const firstValidationMessage = (result: FormValidationResult): string => {
  return result.errors[0]?.message || '请完善表单后再提交';
};
