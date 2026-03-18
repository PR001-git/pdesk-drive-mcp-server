import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { ToolDefinition } from '../models/tool-definition.model.js';
import { ListRecordingsInputSchema } from '../schemas/list-recordings.schema.js';

export function createListRecordingsTool(service: IDriveService): ToolDefinition {
  return {
    name: 'drive_list_recordings',
    description:
      'List meeting recording files (audio/video) in Google Drive, optionally filtered by folder ID.',
    inputSchema: ListRecordingsInputSchema,
    handler: async (input: unknown): Promise<CallToolResult> => {
      try {
        const params = ListRecordingsInputSchema.parse(input);
        const recordings = await service.listRecordings({
          ...(params.folderId !== undefined && { folderId: params.folderId }),
          pageSize: params.pageSize,
        });

        const text =
          recordings.length === 0
            ? 'No recordings found.'
            : recordings
                .map((r) => `${r.id}  ${r.name}  (${r.mimeType})  modified: ${r.modifiedAt.toISOString()}`)
                .join('\n');

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
