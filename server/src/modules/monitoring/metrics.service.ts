import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Gauge,
  Registry,
  register as defaultRegister,
} from 'prom-client';

/**
 * Prometheus 指标服务
 * TASK-363: Define custom metrics for monitoring
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private documentUploadsCounter: Counter;
  private approvalDurationHistogram: Histogram;
  private activeUsersGauge: Gauge;
  private loginFailuresCounter: Counter;
  private apiRequestDurationHistogram: Histogram;
  private databaseQueryDurationHistogram: Histogram;

  private readonly registry: Registry;

  constructor() {
    this.registry = defaultRegister;
  }

  onModuleInit() {
    // 初始化 Counter: 文档上传总数
    this.documentUploadsCounter = new Counter({
      name: 'doc_system_document_uploads_total',
      help: '文档上传总数',
      labelNames: ['department', 'user'],
      registers: [this.registry],
    });

    // 初始化 Histogram: 审批流程耗时
    this.approvalDurationHistogram = new Histogram({
      name: 'doc_system_approval_duration_seconds',
      help: '审批流程耗时 (秒)',
      labelNames: ['approval_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300, 600],
      registers: [this.registry],
    });

    // 初始化 Gauge: 当前活跃用户数
    this.activeUsersGauge = new Gauge({
      name: 'doc_system_active_users',
      help: '当前活跃用户数',
      registers: [this.registry],
    });

    // 初始化 Counter: 登录失败总数
    this.loginFailuresCounter = new Counter({
      name: 'doc_system_login_failures_total',
      help: '登录失败总数',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    // 初始化 Histogram: API 请求耗时
    this.apiRequestDurationHistogram = new Histogram({
      name: 'doc_system_api_request_duration_seconds',
      help: 'API 请求耗时 (秒)',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // 初始化 Histogram: 数据库查询耗时
    this.databaseQueryDurationHistogram = new Histogram({
      name: 'doc_system_database_query_duration_seconds',
      help: '数据库查询耗时 (秒)',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.registry],
    });
  }

  /**
   * 记录文档上传
   */
  recordDocumentUpload(department?: string, user?: string) {
    this.documentUploadsCounter.inc({ department: department || 'unknown', user: user || 'unknown' });
  }

  /**
   * 记录审批流程耗时
   */
  recordApprovalDuration(seconds: number, approvalType: string = 'default') {
    this.approvalDurationHistogram.observe({ approval_type: approvalType }, seconds);
  }

  /**
   * 设置当前活跃用户数
   */
  setActiveUsers(count: number) {
    this.activeUsersGauge.set(count);
  }

  /**
   * 记录登录失败
   */
  recordLoginFailure(reason: string = 'unknown') {
    this.loginFailuresCounter.inc({ reason });
  }

  /**
   * 记录 API 请求耗时
   */
  recordApiRequestDuration(seconds: number, method: string, route: string, status: number) {
    this.apiRequestDurationHistogram.observe({ method, route, status: status.toString() }, seconds);
  }

  /**
   * 记录数据库查询耗时
   */
  recordDatabaseQueryDuration(seconds: number, operation: string) {
    this.databaseQueryDurationHistogram.observe({ operation }, seconds);
  }

  /**
   * 获取所有指标 (Prometheus 格式)
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * 获取指标内容类型
   */
  getContentType(): string {
    return this.registry.contentType;
  }
}
