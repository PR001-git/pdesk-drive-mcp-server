import { z } from 'zod';

export const GetPackageDocsInputSchema = z.object({
  packageName: z
    .string()
    .min(1)
    .describe('The npm package name (e.g. "lodash", "@types/node").'),
});

export type GetPackageDocsInput = z.infer<typeof GetPackageDocsInputSchema>;
