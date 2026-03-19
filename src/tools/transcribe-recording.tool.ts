import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { ToolDefinition, ToolExtra } from '../models/tool-definition.model.js';
import type { ProgressCallback } from '../models/transcribe-params.model.js';
import { ProgressNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { TranscriptionFailedError } from '../errors/transcription-failed.error.js';
import { Logger } from '../logger/index.js';
import { TranscribeRecordingInputSchema } from '../schemas/transcribe-recording.schema.js';

const logger = new Logger('drive_transcribe_recording');

/** Builds a progress callback that sends MCP progress notifications. */
function buildProgressReporter(extra: ToolExtra): ProgressCallback | undefined {
  // Use the client-provided progressToken from _meta, falling back to requestId
  const token = extra._meta?.progressToken ?? extra.requestId;

  if (token === undefined) {
    return undefined;
  }

  return (progress: number, total: number, message: string) => {
    extra.sendNotification({
      method: ProgressNotificationSchema.shape.method.value,
      params: { progressToken: token, progress, total, message },
    }).catch(() => undefined);
  };
}

export function createTranscribeRecordingTool(service: IDriveService): ToolDefinition<typeof TranscribeRecordingInputSchema.shape> {
  return {
    name: 'drive_transcribe_recording',
    description:
      'Transcribe a meeting recording stored in Google Drive to plain text using local OpenAI Whisper. Returns the full transcript, which an AI agent can then summarize or analyse at a fraction of the cost of processing raw audio.',
    inputSchema: TranscribeRecordingInputSchema,
    handler: async (params, extra): Promise<CallToolResult> => {
      try {
        logger.log(`Starting — fileId=${params.recordingFileId} lang=${params.languageCode}`);

        const onProgress = buildProgressReporter(extra);
        const transcription = await service.transcribeRecording(
          params.recordingFileId,
          params.languageCode,
          onProgress
        );

        logger.log(`Done — ${transcription.text.length} chars`);
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
