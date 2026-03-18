import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { UploadError } from '../errors/upload.error.js';
import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { ToolDefinition } from '../models/tool-definition.model.js';
import { UploadFileInputSchema } from '../schemas/upload-file.schema.js';

export function createUploadFileTool(service: IDriveService): ToolDefinition {
  return {
    name: 'drive_upload_file',
    description:
      'Upload a file to Google Drive. File content must be provided as a base64-encoded string.',
    inputSchema: UploadFileInputSchema,
    handler: async (input: unknown): Promise<CallToolResult> => {
      try {
        const params = UploadFileInputSchema.parse(input);
        const contentBuffer = Buffer.from(params.content, 'base64');

        const file = await service.uploadFile({
          name: params.name,
          content: contentBuffer,
          mimeType: params.mimeType,
          folderId: params.folderId,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Uploaded successfully. File ID: ${file.id}, Name: ${file.name}`,
            },
          ],
        };
      } catch (err) {
        const message = err instanceof UploadError ? err.message : 'Failed to upload file.';
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  };
}
