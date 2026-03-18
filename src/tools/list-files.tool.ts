import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { ToolDefinition } from '../models/tool-definition.model.js';
import { ListFilesInputSchema } from '../schemas/list-files.schema.js';

export function createListFilesTool(service: IDriveService): ToolDefinition {
  return {
    name: 'drive_list_files',
    description:
      'List files in Google Drive, optionally filtered by folder ID, MIME type, and page size.',
    inputSchema: ListFilesInputSchema,
    handler: async (input: unknown): Promise<CallToolResult> => {
      try {
        const params = ListFilesInputSchema.parse(input);
        const files = await service.listFiles({
          folderId: params.folderId,
          mimeType: params.mimeType,
          pageSize: params.pageSize,
        });

        const text =
          files.length === 0
            ? 'No files found.'
            : files.map((f) => `${f.id}  ${f.name}  (${f.mimeType})`).join('\n');

        return { content: [{ type: 'text', text }] };
      } catch (err) {
        return buildErrorResult(err);
      }
    },
  };
}

function buildErrorResult(err: unknown): CallToolResult {
  const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
  return { content: [{ type: 'text', text: message }], isError: true };
}
