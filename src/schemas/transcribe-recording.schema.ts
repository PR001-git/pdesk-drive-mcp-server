import { z } from 'zod';

export const TranscribeRecordingInputSchema = z.object({
  recordingFileId: z.string().min(1),
  languageCode: z.string().default('en-US'),
});

export type TranscribeRecordingInput = z.infer<typeof TranscribeRecordingInputSchema>;
