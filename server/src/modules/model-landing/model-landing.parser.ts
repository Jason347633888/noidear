import { ModelLandingFormRow, ModelLandingSummary } from './model-landing.types';

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

export const parseModelLandingCsv = (csv: string): ModelLandingFormRow[] => {
  const lines = csv
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const [, ...dataLines] = lines;

  return dataLines.map((line) => {
    const [templateGroupId, code, formName, path, department, entities, chain, basis] =
      parseCsvLine(line);

    return {
      templateGroupId,
      code,
      formName,
      path,
      department,
      entities: entities ? entities.split(',').map((item) => item.trim()).filter(Boolean) : [],
      chain,
      basis,
    };
  });
};

export const buildGroupSummary = (rows: ModelLandingFormRow[]): ModelLandingSummary => {
  const groupCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.templateGroupId] = (acc[row.templateGroupId] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalForms: rows.length,
    totalGroups: Object.keys(groupCounts).length,
    unmappedCount: rows.filter((row) => row.templateGroupId === 'UNMAPPED').length,
    groupCounts,
  };
};
