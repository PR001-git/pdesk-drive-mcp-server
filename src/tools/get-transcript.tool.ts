import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { ToolDefinition } from '../models/tool-definition.model.js';
import { TranscriptNotFoundError } from '../errors/transcript-not-found.error.js';
import { GetTranscriptInputSchema } from '../schemas/get-transcript.schema.js';

export function createGetTranscriptTool(service: IDriveService): ToolDefinition {
  return {
    name: 'drive_get_transcript',
    description:
      'Retrieve the text transcript for a meeting recording stored in Google Drive, identified by its file ID.',
    inputSchema: GetTranscriptInputSchema,
    handler: async (input: unknown): Promise<CallToolResult> => {
      try {
        const params = GetTranscriptInputSchema.parse(input);
        const transcript = await service.getTranscript(params.recordingFileId);

        return {
          content: [
            { type: 'text', text: `Transcript file ID: ${transcript.transcriptFileId}\n\n${transcript.content}` },
          ],
        };
      } catch (err) {
        if (err instanceof TranscriptNotFoundError) {
          return {
            content: [{ type: 'text', text: err.message }],
            isError: true,
          };
        }
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  };
}
