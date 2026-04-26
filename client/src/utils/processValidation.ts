import { validateFields } from './formValidation';
import type { FormValidationError, FormValidationField, FormValidationResult } from './formValidation';

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

const createError = (fieldKey: string, message: string, errorCode = 'CUSTOM'): FormValidationError => ({
  fieldKey,
  errorCode,
  message,
  severity: 'error',
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
);

const isNumberValue = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const mergeResults = (...results: FormValidationResult[]): FormValidationResult => {
  const errors = results.flatMap((result) => result.errors);
  return { valid: errors.length === 0, errors };
};

const baseStep4Fields = [
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
];

const baseStep5Fields = [
  requiredText('date', '日期'),
  requiredText('productionLine', '生产线'),
  requiredNumber('output', '产量', 0.001),
  requiredText('trialRecord', '试验记录'),
  requiredText('verificationConclusion', '验证结论'),
];

const baseStep6Fields = [
  requiredText('materialConclusion', '原辅料的质量与可靠性'),
  requiredText('physicoChemical', '产品理化及安全性检验'),
  requiredText('shelfLifeTest', '保质期测试'),
  requiredText('finalInspection', '成品检验'),
  requiredText('inspectionMethod', '检验方式'),
];

const baseStep7Fields = [
  requiredText('verificationDate', '验证时间'),
  requiredText('onSiteProcess', '现场工艺'),
  requiredText('potentialHazard', '潜在危害'),
  requiredText('bioHazard', '生物危害'),
  requiredText('chemHazard', '化学危害'),
  requiredText('physHazard', '物理危害'),
  requiredText('allergenHazard', '过敏原'),
  requiredText('controlMeasure', '控制措施'),
];

const validateProcessParams = (values: Record<string, unknown>): FormValidationError[] => {
  const params = values.processParams;
  if (!isRecord(params)) {
    return [createError('processParams', '工艺参数不能为空')];
  }

  const errors: FormValidationError[] = [];
  const exitTemp = params.exitTemp;
  const packTemp = params.packTemp;
  const batterTemp = params.batterTemp;
  const yolkTemp = params.yolkTemp;
  const whiteTemp = params.whiteTemp;

  if (exitTemp === undefined || exitTemp === null || exitTemp === '') {
    errors.push(createError('processParams', '出炉中心温度不能为空'));
  } else if (!isNumberValue(exitTemp)) {
    errors.push(createError('processParams', '出炉中心温度必须是数字'));
  } else if (exitTemp < 0) {
    errors.push(createError('processParams', '出炉中心温度不能小于0'));
  } else if (exitTemp > 300) {
    errors.push(createError('processParams', '出炉中心温度不能大于300'));
  }

  if (packTemp === undefined || packTemp === null || packTemp === '') {
    errors.push(createError('processParams', '包装中心温度不能为空'));
  } else if (!isNumberValue(packTemp)) {
    errors.push(createError('processParams', '包装中心温度必须是数字'));
  } else if (packTemp < 0) {
    errors.push(createError('processParams', '包装中心温度不能小于0'));
  } else if (packTemp > 60) {
    errors.push(createError('processParams', '包装中心温度不能大于60'));
  }

  const hasBatterTemp = isNumberValue(batterTemp);
  const hasYolkAndWhiteTemps = isNumberValue(yolkTemp) && isNumberValue(whiteTemp);
  if (!hasBatterTemp && !hasYolkAndWhiteTemps) {
    errors.push(createError('processParams', '暂存锅温度不能为空'));
  }

  if (!isRecord(params.ovenZones) || Object.keys(params.ovenZones).length === 0) {
    errors.push(createError('processParams', '炉温参数不能为空'));
  }

  if (!Array.isArray(params.fanDevices) || params.fanDevices.length === 0) {
    errors.push(createError('processParams', '风机频率不能为空'));
  }

  return errors;
};

const validateChecklist = (
  values: Record<string, unknown>,
  items: Array<{ key: string; label: string }>,
): FormValidationError[] => items.flatMap(({ key, label }) => (
  values[key] === true ? [] : [createError(key, `${label}必须确认`)]
));

export const validateStep1 = (values: Record<string, unknown>): FormValidationResult => validateFields([
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
], values);

export const validateStep2 = (values: Record<string, unknown>): FormValidationResult => validateFields([
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
], values);

export const validateStep4 = (values: Record<string, unknown>): FormValidationResult => mergeResults(
  validateFields(baseStep4Fields, values),
  { valid: false, errors: validateProcessParams(values) },
);

export const validateStep5 = (values: Record<string, unknown>): FormValidationResult => mergeResults(
  validateFields(baseStep5Fields, values),
  { valid: false, errors: validateProcessParams(values) },
);

export const validateStep6 = (values: Record<string, unknown>): FormValidationResult => mergeResults(
  validateFields(baseStep6Fields, values),
  {
    valid: false,
    errors: validateChecklist(values, [
      { key: 'cert3in1', label: '原料生产商三证合一' },
      { key: 'thirdPartyTest', label: '拥有第三方检测标准' },
      { key: 'batchReport', label: '批次检验报告' },
      { key: 'hazardAnalysis', label: '原料潜在危害分析（生物/化学/物理/过敏原/食品欺诈）' },
      { key: 'materialCompliant', label: '原料符合执行标准、验收项目' },
    ]),
  },
);

export const validateStep7 = (values: Record<string, unknown>): FormValidationResult => mergeResults(
  validateFields(baseStep7Fields, values),
  {
    valid: false,
    errors: validateChecklist(values, [
      { key: 'ccpLimitOk', label: '关键限值符合工艺范围' },
      { key: 'ccpMonitorOk', label: '明确监控方法、频率、责任人' },
      { key: 'ccpDeviceOk', label: '设备具备纠偏控制' },
      { key: 'ccpPersonnelOk', label: '关键岗位人员具有纠偏措施意识' },
    ]),
  },
);

export const firstValidationMessage = (result: FormValidationResult): string => result.errors[0]?.message || '请完善表单后再提交';
