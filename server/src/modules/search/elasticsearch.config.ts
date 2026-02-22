import { Client } from '@elastic/elasticsearch';
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';

export const ES_INDEX = 'documents';

/**
 * ElasticSearch 索引映射配置（TASK-401）
 * 连接地址从 ELASTICSEARCH_URL 环境变量读取（见 search.service.ts）
 * 生产环境可安装 analysis-ik 插件后启用中文分词
 */
const ES_MAPPINGS = {
  properties: {
    title: { type: 'text' as const, boost: 2 },
    content: { type: 'text' as const },
    fileType: { type: 'keyword' as const },
    departmentId: { type: 'keyword' as const },
    tags: { type: 'keyword' as const },
    createdAt: { type: 'date' as const },
  },
};

/**
 * 幂等创建索引（若已存在则跳过）
 */
export async function createIndexIfNotExists(client: Client): Promise<void> {
  const exists = await client.indices.exists({ index: ES_INDEX });
  if (exists) return;

  // settings 留空使用默认 standard analyzer；生产环境配置 ik_max_word 时替换
  const settings: IndicesIndexSettings = {};

  await client.indices.create({
    index: ES_INDEX,
    settings,
    mappings: ES_MAPPINGS,
  });
}
