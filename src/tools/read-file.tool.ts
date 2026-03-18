import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { FileNotFoundError } from '../errors/file-not-found.error.js';
import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { ToolDefinition } from '../models/tool-definition.model.js';
import { ReadFileInputSchema } from '../schemas/read-file.schema.js';

export function createReadFileTool(service: IDriveService): ToolDefinition {
  return {
    name: 'drive_read_file',
    description: 'Read the content of a file from Google Drive by its file ID.',
    inputSchema: ReadFileInputSchema,
    handler: async (input: unknown): Promise<CallToolResult> => {
      try {
        const { fileId } = ReadFileInputSchema.parse(input);
        const { content, encoding } = await service.readFile(fileId);

        if (encoding === 'base64') {
          return {
            content: [{ type: 'text', text: `[binary, base64-encoded]\n${content}` }],
          };
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (err) {
        const message =
          err instanceof FileNotFoundError ? err.message : 'Failed to read file.';
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  };
}
