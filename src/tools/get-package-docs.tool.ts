import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { IDocsService } from '../interfaces/docs-service.interface.js';
import type { ToolDefinition } from '../models/tool-definition.model.js';
import { NoGithubRepoError } from '../errors/no-github-repo.error.js';
import { PackageNotFoundError } from '../errors/package-not-found.error.js';
import { ReadmeNotFoundError } from '../errors/readme-not-found.error.js';
import { GetPackageDocsInputSchema } from '../schemas/get-package-docs.schema.js';

export function createGetPackageDocsTool(
  service: IDocsService
): ToolDefinition<typeof GetPackageDocsInputSchema.shape> {
  return {
    name: 'npm_get_package_docs',
    description:
      'Fetch the latest README documentation for an npm package by resolving its GitHub repository.',
    inputSchema: GetPackageDocsInputSchema,
    handler: async (params): Promise<CallToolResult> => {
      try {
        const docs = await service.getPackageDocs(params.packageName);

        const header = [
          `# ${docs.packageName} @ ${docs.version}`,
          `Source: ${docs.repoUrl}`,
          '',
        ].join('\n');

        return { content: [{ type: 'text', text: header + docs.content }] };
      } catch (err) {
        const message = formatError(err);
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  };
}

function formatError(err: unknown): string {
  if (err instanceof PackageNotFoundError) return err.message;
  if (err instanceof NoGithubRepoError) return err.message;
  if (err instanceof ReadmeNotFoundError) return err.message;
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}
