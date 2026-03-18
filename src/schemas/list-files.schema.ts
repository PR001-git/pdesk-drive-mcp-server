import { z } from 'zod';

export const ListFilesInputSchema = z.object({
  folderId: z.string().optional(),
  mimeType: z.string().optional(),
  pageSize: z.number().int().min(1).max(1000).default(50),
});

export type ListFilesInput = z.infer<typeof ListFilesInputSchema>;
