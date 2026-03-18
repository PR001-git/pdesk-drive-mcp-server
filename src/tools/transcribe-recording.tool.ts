import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { ToolDefinition } from '../models/tool-definition.model.js';
import { TranscriptionFailedError } from '../errors/transcription-failed.error.js';
import { TranscribeRecordingInputSchema } from '../schemas/transcribe-recording.schema.js';

export function createTranscribeRecordingTool(service: IDriveService): ToolDefinition<typeof TranscribeRecordingInputSchema.shape> {
  return {
    name: 'drive_transcribe_recording',
    description:
      'Transcribe a meeting recording stored in Google Drive to plain text using Google Cloud Speech-to-Text. Returns the full transcript, which an AI agent can then summarize or analyse at a fraction of the cost of processing raw audio.',
    inputSchema: TranscribeRecordingInputSchema,
    handler: async (params): Promise<CallToolResult> => {
      try {
        const transcription = await service.transcribeRecording(
          params.recordingFileId,
          params.languageCode
        );

        return { content: [{ type: 'text', text: transcription.text }] };
      } catch (err) {
        if (err instanceof TranscriptionFailedError) {
          return { content: [{ type: 'text', text: err.message }], isError: true };
        }
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  };
}
