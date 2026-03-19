import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodObject, ZodRawShape } from 'zod';

/** The `extra` object MCP passes to tool handlers (second argument of ToolCallback). */
export type ToolExtra = Parameters<ToolCallback<ZodRawShape>>[1];

export interface ToolDefinition<T extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  inputSchema: ZodObject<T>;
  handler: ToolCallback<T>;
}
