import * as ExcelJS from 'exceljs';
import {
  mapTrainingStatusLabel,
  TrainingStatisticsExportService,
} from './training-statistics-export.service';

it('maps every TrainingProjectStatus explicitly', () => {
  expect(mapTrainingStatusLabel('planned' as any)).toBe('计划中');
  expect(mapTrainingStatusLabel('ongoing' as any)).toBe('进行中');
  expect(mapTrainingStatusLabel('completed' as any)).toBe('已完成');
  expect(mapTrainingStatusLabel('cancelled' as any)).toBe('已取消');
  expect(() => mapTrainingStatusLabel('paused' as any)).toThrow(/training status out of contract/);
});

it('exports trainer display name and trainee count, not internal IDs', async () => {
  const service = new TrainingStatisticsExportService({
    trainingProject: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([{
        id: 'project-1',
        title: '年度质量培训',
        department: '质量部',
        quarter: 2,
        status: 'planned',
        trainerId: 'user-trainer-1',
        trainees: ['u1', 'u2', 'u3'],
        scheduledDate: new Date('2026-05-20T00:00:00.000Z'),
        createdAt: new Date('2026-05-14T00:00:00.000Z'),
        learningRecords: [{ id: 'lr-1' }, { id: 'lr-2' }],
      }]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 'user-trainer-1', name: '张三', username: 'zhangsan' }]),
    },
  } as any);

  const buffer = await service.exportProjects();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const row = workbook.getWorksheet('培训统计')!.getRow(2).values as any[];

  expect(row).toContain('张三');
  expect(row).not.toContain('user-trainer-1');
  expect(row).toContain(3);
});

it('rejects defensive over-limit training statistics exports', async () => {
  const service = new TrainingStatisticsExportService({
    trainingProject: {
      count: jest.fn().mockResolvedValue(10001),
      findMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
  } as any);

  await expect(service.exportProjects()).rejects.toThrow('培训统计导出最多支持 10000 条');
});
