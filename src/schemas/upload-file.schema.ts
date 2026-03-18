import { z } from 'zod';

export const UploadFileInputSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1), // base64-encoded file content
  mimeType: z.string().min(1),
  folderId: z.string().optional(),
});

export type UploadFileInput = z.infer<typeof UploadFileInputSchema>;
