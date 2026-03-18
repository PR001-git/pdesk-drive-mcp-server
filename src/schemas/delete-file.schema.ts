import { z } from 'zod';

export const DeleteFileInputSchema = z.object({
  fileId: z.string().min(1),
});

export type DeleteFileInput = z.infer<typeof DeleteFileInputSchema>;
