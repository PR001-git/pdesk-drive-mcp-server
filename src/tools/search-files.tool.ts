import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { ToolDefinition } from '../models/tool-definition.model.js';
import { SearchFilesInputSchema } from '../schemas/search-files.schema.js';

export function createSearchFilesTool(service: IDriveService): ToolDefinition {
  return {
    name: 'drive_search_files',
    description:
      "Search for files in Google Drive using the Drive query syntax (e.g. \"name contains 'report'\").",
    inputSchema: SearchFilesInputSchema,
    handler: async (input: unknown): Promise<CallToolResult> => {
      try {
        const params = SearchFilesInputSchema.parse(input);
        const files = await service.searchFiles({
          query: params.query,
          pageSize: params.pageSize,
        });

        const text =
          files.length === 0
            ? 'No files matched the query.'
            : files.map((f) => `${f.id}  ${f.name}  (${f.mimeType})`).join('\n');

        return { content: [{ type: 'text', text }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed.';
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  };
}
