import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { discover } from './tools/discover.js';
import { callApi, callApiAs, ApiArgs } from './tools/call-api.js';
import { healthCheck, getLogs, queryDb, restartService, runMigration } from './tools/devops.js';
import { runTests, getTestReport } from './tools/testing.js';

const server = new Server(
  { name: 'noidear-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Tool registry - populated by T04-T08
export const toolRegistry: Record<string, {
  description: string;
  inputSchema: Tool['inputSchema'];
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}> = {};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: Object.entries(toolRegistry).map(([name, { description, inputSchema }]) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolRegistry[request.params.name];
  if (!tool) throw new Error(`Unknown tool: ${request.params.name}`);
  const result = await tool.handler(
    (request.params.arguments ?? {}) as Record<string, unknown>
  );
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});

// T04: discover
toolRegistry['discover'] = {
  description: '动态读取 Swagger，返回当前系统所有可用 API。新功能上线后自动感知，无需更新 MCP。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      module: { type: 'string', description: '可选：过滤模块关键词，如 process/warehouse/document' },
    },
  },
  handler: (args) => discover(args as { module?: string }),
};

// T05: call_api
toolRegistry['call_api'] = {
  description: '以 admin 身份调用系统任意 API 端点。适合日常操作和查询。',
  inputSchema: {
    type: 'object' as const,
    required: ['path', 'method'],
    properties: {
      path: { type: 'string', description: 'API 路径，如 /process/instances' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      body: { type: 'object', description: '请求体（POST/PUT/PATCH 时使用）' },
      query: { type: 'object', description: 'Query 参数（GET 时使用）' },
    },
  },
  handler: (args) => callApi(args as unknown as ApiArgs),
};

// T05: call_api_as
toolRegistry['call_api_as'] = {
  description: '以指定角色身份调用 API。适合测试角色权限边界，如 HACCP 审批。',
  inputSchema: {
    type: 'object' as const,
    required: ['role', 'path', 'method'],
    properties: {
      role: { type: 'string', description: '角色/用户名，如 admin、haccp' },
      path: { type: 'string' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      body: { type: 'object' },
      query: { type: 'object' },
    },
  },
  handler: (args) => callApiAs(args as unknown as { role: string } & ApiArgs),
};

// T06: health_check
toolRegistry['health_check'] = {
  description: '检查所有 Docker 服务（postgres/redis/server/client）的健康状态。',
  inputSchema: { type: 'object' as const, properties: {} },
  handler: () => healthCheck(),
};

// T06: get_logs
toolRegistry['get_logs'] = {
  description: '获取指定服务的 Docker 日志。默认过滤 ERROR/WARN，level=all 返回全部。',
  inputSchema: {
    type: 'object' as const,
    required: ['service'],
    properties: {
      service: { type: 'string', enum: ['server', 'client', 'postgres', 'redis'] },
      lines: { type: 'number', default: 50 },
      level: { type: 'string', enum: ['error', 'all'], default: 'error' },
    },
  },
  handler: (args) => Promise.resolve(getLogs(args as { service: string; lines?: number; level?: string })),
};

// T07: query_db
toolRegistry['query_db'] = {
  description: '执行只读 SQL 查询（SELECT only）。用于诊断数据库状态。',
  inputSchema: {
    type: 'object' as const,
    required: ['sql'],
    properties: { sql: { type: 'string', description: '必须是 SELECT 语句' } },
  },
  handler: (args) => Promise.resolve(queryDb(args as { sql: string })),
};

// T07: restart_service
toolRegistry['restart_service'] = {
  description: '重启指定 Docker 容器。允许：server/client/redis。',
  inputSchema: {
    type: 'object' as const,
    required: ['service'],
    properties: { service: { type: 'string', enum: ['server', 'client', 'redis'] } },
  },
  handler: (args) => Promise.resolve(restartService(args as { service: string })),
};

// T07: run_migration
toolRegistry['run_migration'] = {
  description: '执行 Prisma migrate deploy，应用待执行的数据库迁移。',
  inputSchema: { type: 'object' as const, properties: {} },
  handler: () => Promise.resolve(runMigration()),
};

// T08: run_tests
toolRegistry['run_tests'] = {
  description: '触发 Playwright E2E 测试，返回通过/失败统计。flow 可选：all/auth/process/warehouse/document。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      flow: { type: 'string', enum: ['all', 'auth', 'process', 'warehouse', 'document'] },
    },
  },
  handler: (args) => Promise.resolve(runTests(args as { flow?: string })),
};

// T08: get_test_report
toolRegistry['get_test_report'] = {
  description: '获取最近一次测试结果，无需重新运行测试。',
  inputSchema: { type: 'object' as const, properties: {} },
  handler: () => Promise.resolve(getTestReport()),
};

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('[noidear-mcp] Server ready\n');
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[noidear-mcp] Fatal: ${msg}\n`);
  process.exit(1);
});
