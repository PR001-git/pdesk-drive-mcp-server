import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { output, ZodObject, ZodRawShape } from 'zod';

export interface ToolDefinition<T extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  inputSchema: ZodObject<T>;
  handler: (args: output<ZodObject<T>>) => Promise<CallToolResult>;
}
