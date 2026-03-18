import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { IAudioPreparationService } from '../interfaces/audio-preparation-service.interface.js';
import type { ToolDefinition } from '../models/tool-definition.model.js';
import { AudioConversionError } from '../errors/audio-conversion.error.js';
import { FfmpegNotInstalledError } from '../errors/ffmpeg-not-installed.error.js';
import { NoAudioStreamError } from '../errors/no-audio-stream.error.js';
import { PrepareAudioInputSchema } from '../schemas/prepare-audio.schema.js';

export function createPrepareAudioTool(
  service: IAudioPreparationService
): ToolDefinition<typeof PrepareAudioInputSchema.shape> {
  return {
    name: 'audio_prepare_file',
    description:
      'Prepare an audio or video file for transcription by converting unsupported formats (e.g. MP4, MKV) to MP3. Returns the path to the transcription-ready audio file.',
    inputSchema: PrepareAudioInputSchema,
    handler: async (params): Promise<CallToolResult> => {
      try {
        const result = await service.prepare(params.filePath, params.mimeType);

        const lines = [
          `outputPath: ${result.filePath}`,
          `mimeType:   ${result.mimeType}`,
          `converted:  ${result.wasConverted ? 'yes — temporary file created at the path above' : 'no — original format is supported'}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: formatError(err) }], isError: true };
      }
    },
  };
}

function formatError(err: unknown): string {
  if (err instanceof FfmpegNotInstalledError) return err.message;
  if (err instanceof NoAudioStreamError) return err.message;
  if (err instanceof AudioConversionError) return err.message;
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}
