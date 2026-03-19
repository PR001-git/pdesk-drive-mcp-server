import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShape } from 'zod';

import type { IAudioPreparationService } from '../../interfaces/audio-preparation-service.interface.js';
import type { IDocsService } from '../../interfaces/docs-service.interface.js';
import type { IDriveService } from '../../interfaces/drive-service.interface.js';
import type { ToolDefinition } from '../../models/tool-definition.model.js';
import { createDeleteFileTool } from '../delete-file.tool.js';
import { createGetPackageDocsTool } from '../get-package-docs.tool.js';
import { createGetTranscriptTool } from '../get-transcript.tool.js';
import { createListFilesTool } from '../list-files.tool.js';
import { createListRecordingsTool } from '../list-recordings.tool.js';
import { createPrepareAudioTool } from '../prepare-audio.tool.js';
import { createReadFileTool } from '../read-file.tool.js';
import { createSearchFilesTool } from '../search-files.tool.js';
import { createTranscribeRecordingTool } from '../transcribe-recording.tool.js';
import { createUploadFileTool } from '../upload-file.tool.js';

export function registerAllTools(
  server: McpServer,
  driveService: IDriveService,
  docsService: IDocsService,
  audioPrep: IAudioPreparationService
): void {
  // Uses a generic to preserve the type relationship between each tool's
  // schema shape and its handler, avoiding contravariance issues.
  function register<T extends ZodRawShape>(tool: ToolDefinition<T>): void {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema.shape },
      tool.handler
    );
  }

  register(createListFilesTool(driveService));
  register(createListRecordingsTool(driveService));
  register(createReadFileTool(driveService));
  register(createGetTranscriptTool(driveService));
  register(createTranscribeRecordingTool(driveService));
  register(createUploadFileTool(driveService));
  register(createSearchFilesTool(driveService));
  register(createDeleteFileTool(driveService));
  register(createGetPackageDocsTool(docsService));
  register(createPrepareAudioTool(audioPrep));
}
