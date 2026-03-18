import { z } from 'zod';

export const ListRecordingsInputSchema = z.object({
  folderId: z.string().optional(),
  pageSize: z.number().int().min(1).max(1000).default(50),
});

export type ListRecordingsInput = z.infer<typeof ListRecordingsInputSchema>;