import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { IDocsService } from '../../interfaces/docs-service.interface.js';
import type { IDriveService } from '../../interfaces/drive-service.interface.js';
import { createDeleteFileTool } from '../delete-file.tool.js';
import { createGetPackageDocsTool } from '../get-package-docs.tool.js';
import { createGetTranscriptTool } from '../get-transcript.tool.js';
import { createListFilesTool } from '../list-files.tool.js';
import { createListRecordingsTool } from '../list-recordings.tool.js';
import { createReadFileTool } from '../read-file.tool.js';
import { createSearchFilesTool } from '../search-files.tool.js';
import { createTranscribeRecordingTool } from '../transcribe-recording.tool.js';
import { createUploadFileTool } from '../upload-file.tool.js';

export function registerAllTools(
  server: McpServer,
  driveService: IDriveService,
  docsService: IDocsService
): void {
  for (const tool of [
    createListFilesTool(driveService),
    createListRecordingsTool(driveService),
    createReadFileTool(driveService),
    createGetTranscriptTool(driveService),
    createTranscribeRecordingTool(driveService),
    createUploadFileTool(driveService),
    createSearchFilesTool(driveService),
    createDeleteFileTool(driveService),
    createGetPackageDocsTool(docsService),
  ] as const) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema.shape },
      tool.handler
    );
  }
}
