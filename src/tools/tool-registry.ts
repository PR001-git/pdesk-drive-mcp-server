import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { IDriveService } from '../interfaces/drive-service.interface.js';
import { createDeleteFileTool } from './delete-file.tool.js';
import { createListFilesTool } from './list-files.tool.js';
import { createReadFileTool } from './read-file.tool.js';
import { createSearchFilesTool } from './search-files.tool.js';
import { createUploadFileTool } from './upload-file.tool.js';

export function registerAllTools(server: McpServer, service: IDriveService): void {
  const tools = [
    createListFilesTool(service),
    createReadFileTool(service),
    createUploadFileTool(service),
    createSearchFilesTool(service),
    createDeleteFileTool(service),
  ];

  for (const tool of tools) {
    server.tool(tool.name, tool.description, tool.inputSchema.shape, tool.handler);
  }
}
