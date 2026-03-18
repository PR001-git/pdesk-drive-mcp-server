import { z } from 'zod';

export const PrepareAudioInputSchema = z.object({
  filePath: z.string().min(1, 'filePath is required'),
  mimeType: z.string().min(1, 'mimeType is required'),
});

export type PrepareAudioInput = z.infer<typeof PrepareAudioInputSchema>;
