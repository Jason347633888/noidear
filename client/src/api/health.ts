import request from './request';

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
}

export interface DiskStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  available: string;
  usage: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    postgres: ServiceHealth;
    redis: ServiceHealth;
    minio: ServiceHealth;
    disk: DiskStatus;
  };
}

// 综合健康检查
export const getHealth = () => {
  return request.get<HealthCheckResponse>('/health');
};

// PostgreSQL 健康检查
export const getPostgresHealth = () => {
  return request.get<ServiceHealth>('/health/postgres');
};

// Redis 健康检查
export const getRedisHealth = () => {
  return request.get<ServiceHealth>('/health/redis');
};

// MinIO 健康检查
export const getMinIOHealth = () => {
  return request.get<ServiceHealth>('/health/minio');
};

// 磁盘空间检查
export const getDiskHealth = () => {
  return request.get<DiskStatus>('/health/disk');
};

// 所有依赖服务状态
export const getDependencies = () => {
  return request.get<HealthCheckResponse['services']>('/health/dependencies');
};
