import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

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
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  const result = await tool.handler(
    (request.params.arguments ?? {}) as Record<string, unknown>
  );
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Use stderr so it doesn't interfere with MCP stdio protocol
  console.error('[noidear-mcp] Server ready');
}

main().catch((err) => {
  console.error('[noidear-mcp] Fatal error:', err);
  process.exit(1);
});
