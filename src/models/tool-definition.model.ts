import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ZodRawShape } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  // .shape is extracted at registration time by the tool registry
  inputSchema: { shape: ZodRawShape };
  handler: (input: unknown) => Promise<CallToolResult>;
}
