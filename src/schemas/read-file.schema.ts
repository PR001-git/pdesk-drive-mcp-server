import { z } from 'zod';

export const ReadFileInputSchema = z.object({
  fileId: z.string().min(1),
});

export type ReadFileInput = z.infer<typeof ReadFileInputSchema>;
