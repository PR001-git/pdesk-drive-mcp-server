import { z } from 'zod';

export const SearchFilesInputSchema = z.object({
  query: z.string().min(1),
  pageSize: z.number().int().min(1).max(1000).default(50),
});

export type SearchFilesInput = z.infer<typeof SearchFilesInputSchema>;
