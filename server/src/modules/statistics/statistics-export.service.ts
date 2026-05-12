import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { formatStatus } from '../../shared/utils/format.util';

const COMMON_STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  pending: '待处理',
  pending_review: '待审核',
  pending_approval: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  completed: '已完成',
  cancelled: '已取消',
  active: '启用',
  inactive: '禁用',
};

@Injectable()
export class StatisticsExportService {
  async exportDocumentStatistics(stats: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet('总体统计');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '数值', key: 'value', width: 20 },
    ];
    summarySheet.addRow({ metric: '文档总数', value: stats.total });
    summarySheet.addRow({ metric: '增长率', value: `${stats.growthRate}%` });

    const levelSheet = workbook.addWorksheet('按级别统计');
    levelSheet.columns = [
      { header: '级别', key: 'level', width: 15 },
      { header: '数量', key: 'count', width: 15 },
      { header: '占比', key: 'percentage', width: 15 },
    ];
    stats.byLevel.forEach((item: any) => {
      levelSheet.addRow({
        level: `${item.level}级`,
        count: item.count,
        percentage: `${item.percentage}%`,
      });
    });

    const statusSheet = workbook.addWorksheet('按状态统计');
    statusSheet.columns = [
      { header: '状态', key: 'status', width: 15 },
      { header: '数量', key: 'count', width: 15 },
      { header: '占比', key: 'percentage', width: 15 },
    ];
    stats.byStatus.forEach((item: any) => {
      statusSheet.addRow({
        status: formatStatus(item.status, COMMON_STATUS_MAP),
        count: item.count,
        percentage: `${item.percentage}%`,
      });
    });

    const deptSheet = workbook.addWorksheet('按部门统计');
    deptSheet.columns = [
      { header: '部门名称', key: 'name', width: 30 },
      { header: '文档数量', key: 'count', width: 15 },
    ];
    stats.byDepartment.forEach((item: any) => {
      deptSheet.addRow({ name: item.name, count: item.count });
    });

    const trendSheet = workbook.addWorksheet('趋势统计');
    trendSheet.columns = [
      { header: '日期', key: 'date', width: 20 },
      { header: '文档数量', key: 'count', width: 15 },
    ];
    stats.trend.forEach((item: any) => {
      trendSheet.addRow({ date: item.date, count: item.count });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportTaskStatistics(stats: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet('总体统计');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '数值', key: 'value', width: 20 },
    ];
    summarySheet.addRow({ metric: '任务总数', value: stats.total });
    summarySheet.addRow({ metric: '已完成', value: stats.completed });
    summarySheet.addRow({ metric: '已逾期', value: stats.overdue });
    summarySheet.addRow({ metric: '完成率', value: `${stats.completionRate}%` });
    summarySheet.addRow({ metric: '逾期率', value: `${stats.overdueRate}%` });
    summarySheet.addRow({ metric: '平均完成时间(小时)', value: stats.avgCompletionTime });

    const deptSheet = workbook.addWorksheet('按部门统计');
    deptSheet.columns = [
      { header: '部门名称', key: 'name', width: 30 },
      { header: '任务数量', key: 'count', width: 15 },
      { header: '完成率', key: 'completionRate', width: 15 },
    ];
    stats.byDepartment.forEach((item: any) => {
      deptSheet.addRow({
        name: item.name,
        count: item.count,
        completionRate: `${item.completionRate}%`,
      });
    });

    const templateSheet = workbook.addWorksheet('按模板统计');
    templateSheet.columns = [
      { header: '模板名称', key: 'name', width: 30 },
      { header: '任务数量', key: 'count', width: 15 },
    ];
    stats.byTemplate.forEach((item: any) => {
      templateSheet.addRow({ name: item.name, count: item.count });
    });

    const statusSheet = workbook.addWorksheet('按状态统计');
    statusSheet.columns = [
      { header: '状态', key: 'status', width: 15 },
      { header: '数量', key: 'count', width: 15 },
    ];
    stats.byStatus.forEach((item: any) => {
      statusSheet.addRow({
        status: formatStatus(item.status, COMMON_STATUS_MAP),
        count: item.count,
      });
    });

    const trendSheet = workbook.addWorksheet('趋势统计');
    trendSheet.columns = [
      { header: '日期', key: 'date', width: 20 },
      { header: '已创建', key: 'created', width: 15 },
      { header: '已完成', key: 'completed', width: 15 },
    ];
    stats.trend.forEach((item: any) => {
      trendSheet.addRow({
        date: item.date,
        created: item.created,
        completed: item.completed,
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportApprovalStatistics(stats: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet('总体统计');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '数值', key: 'value', width: 20 },
    ];
    summarySheet.addRow({ metric: '审批总数', value: stats.total });
    summarySheet.addRow({ metric: '已通过', value: stats.approved });
    summarySheet.addRow({ metric: '已驳回', value: stats.rejected });
    summarySheet.addRow({ metric: '待审批', value: stats.pending });
    summarySheet.addRow({ metric: '通过率', value: `${stats.approvalRate}%` });
    summarySheet.addRow({ metric: '平均审批时间(小时)', value: stats.avgApprovalTime });

    const approverSheet = workbook.addWorksheet('按审批人统计');
    approverSheet.columns = [
      { header: '审批人', key: 'name', width: 20 },
      { header: '已通过', key: 'approved', width: 15 },
      { header: '已驳回', key: 'rejected', width: 15 },
      { header: '平均审批时间(小时)', key: 'avgTime', width: 20 },
    ];
    stats.byApprover.forEach((item: any) => {
      approverSheet.addRow({
        name: item.name,
        approved: item.approved,
        rejected: item.rejected,
        avgTime: item.avgTime,
      });
    });

    const trendSheet = workbook.addWorksheet('趋势统计');
    trendSheet.columns = [
      { header: '日期', key: 'date', width: 20 },
      { header: '已通过', key: 'approved', width: 15 },
      { header: '已驳回', key: 'rejected', width: 15 },
    ];
    stats.trend.forEach((item: any) => {
      trendSheet.addRow({
        date: item.date,
        approved: item.approved,
        rejected: item.rejected,
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
