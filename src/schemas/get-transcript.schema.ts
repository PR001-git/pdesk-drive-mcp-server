import { z } from 'zod';

export const GetTranscriptInputSchema = z.object({
  recordingFileId: z.string().min(1),
});

export type GetTranscriptInput = z.infer<typeof GetTranscriptInputSchema>;