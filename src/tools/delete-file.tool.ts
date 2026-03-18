import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { FileNotFoundError } from '../errors/file-not-found.error.js';
import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { ToolDefinition } from '../models/tool-definition.model.js';
import { DeleteFileInputSchema } from '../schemas/delete-file.schema.js';

export function createDeleteFileTool(service: IDriveService): ToolDefinition {
  return {
    name: 'drive_delete_file',
    description: 'Permanently delete a file from Google Drive by its file ID.',
    inputSchema: DeleteFileInputSchema,
    handler: async (input: unknown): Promise<CallToolResult> => {
      try {
        const { fileId } = DeleteFileInputSchema.parse(input);
        await service.deleteFile(fileId);
        return {
          content: [{ type: 'text', text: `File ${fileId} deleted successfully.` }],
        };
      } catch (err) {
        const message =
          err instanceof FileNotFoundError ? err.message : 'Failed to delete file.';
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  };
}
