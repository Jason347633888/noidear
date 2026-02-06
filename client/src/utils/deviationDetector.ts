import type { DeviationField } from '@/components/deviation/DeviationReasonDialog.vue';

export interface ToleranceConfig {
  fieldName: string;
  toleranceType: 'range' | 'percentage';
  toleranceMin: number;
  toleranceMax: number;
}

export interface DeviationDetectionResult {
  hasDeviation: boolean;
  deviations: DeviationField[];
}

/**
 * 检测字段值是否偏离公差范围
 * @param formData 表单数据
 * @param toleranceConfigs 公差配置列表
 * @returns 偏离检测结果
 */
export function detectDeviations(
  formData: Record<string, any>,
  toleranceConfigs: ToleranceConfig[],
): DeviationDetectionResult {
  const deviations: DeviationField[] = [];

  for (const config of toleranceConfigs) {
    const actualValue = formData[config.fieldName];

    // 如果字段值为空或非数字，跳过
    if (actualValue === null || actualValue === undefined || typeof actualValue !== 'number') {
      continue;
    }

    // 假设期望值是公差范围的中点（在实际应用中，期望值应该从模板或其他地方获取）
    // 这里简化处理：使用公差配置的平均值作为期望值
    const expectedValue = (config.toleranceMin + config.toleranceMax) / 2;

    let minAllowed: number;
    let maxAllowed: number;

    if (config.toleranceType === 'range') {
      // 范围公差：期望值 ± 公差范围
      minAllowed = expectedValue - config.toleranceMin;
      maxAllowed = expectedValue + config.toleranceMax;
    } else {
      // 百分比公差：期望值 × (1 ± 百分比)
      minAllowed = expectedValue * (1 - config.toleranceMin / 100);
      maxAllowed = expectedValue * (1 + config.toleranceMax / 100);
    }

    // 检测是否偏离
    if (actualValue < minAllowed || actualValue > maxAllowed) {
      const deviationValue = actualValue - expectedValue;
      const deviationRate = expectedValue !== 0 
        ? (deviationValue / expectedValue) * 100 
        : 0;

      deviations.push({
        fieldName: config.fieldName,
        expectedValue,
        actualValue,
        deviationValue,
        deviationRate,
        toleranceType: config.toleranceType,
        toleranceMin: config.toleranceMin,
        toleranceMax: config.toleranceMax,
      });
    }
  }

  return {
    hasDeviation: deviations.length > 0,
    deviations,
  };
}

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;
  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
