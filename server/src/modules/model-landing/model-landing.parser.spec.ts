import { buildGroupSummary, parseModelLandingCsv } from './model-landing.parser';

describe('modelLanding parser', () => {
  it('parses quoted CSV rows and builds stable summary counts', () => {
    const csv = [
      '模板组 ID,编号,表单名,路径,部门,entities,chain,basis',
      'FG-quality-environment-cleaning-02,GRSS-ZZ-JL-19,日常清洁记录表（中段）,制造部/日常清洁记录表（中段）.md,制造部,"CleaningRecord,Employee,Location",通用支撑,v3:环境卫生',
      'FG-quality-environment-cleaning-02,GRSS-ZZ-JL-20,日常清洁记录表（出炉间）,制造部/日常清洁记录表（出炉间）.md,制造部,"CleaningRecord,Employee,Location",通用支撑,v3:环境卫生',
      'FG-batch-production-01,GRSS-ZZ-JL-48,生产计划,制造部/生产计划.md,制造部,"Product,ProductionBatch",主数据/基础档案,v3:生产批次',
    ].join('\n');

    const rows = parseModelLandingCsv(csv);
    const summary = buildGroupSummary(rows);

    expect(rows).toHaveLength(3);
    expect(rows[0].entities).toEqual(['CleaningRecord', 'Employee', 'Location']);
    expect(summary.totalForms).toBe(3);
    expect(summary.totalGroups).toBe(2);
    expect(summary.groupCounts['FG-quality-environment-cleaning-02']).toBe(2);
    expect(summary.unmappedCount).toBe(0);
  });
});
