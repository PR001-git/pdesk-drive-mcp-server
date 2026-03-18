import { Readable } from 'node:stream';

import type { drive_v3 } from 'googleapis';

import type { IDriveRepository } from '../interfaces/drive-repository.interface.js';
import type { DriveFile } from '../models/drive-file.model.js';
import type { ListFilesParams } from '../models/list-params.model.js';
import type { SearchParams } from '../models/search-params.model.js';
import type { UploadParams } from '../models/upload-params.model.js';
import { FileNotFoundError } from '../errors/file-not-found.error.js';
import { UploadError } from '../errors/upload.error.js';
import { mapToDriveFile } from './drive.mapper.js';

const FILE_FIELDS = 'id,name,mimeType,size,modifiedTime,parents';
const LIST_FIELDS = `files(${FILE_FIELDS}),nextPageToken`;

// Maps Google Workspace MIME types to a plain-text export format
const EXPORT_MIME_MAP: Record<string, string> = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
  'application/vnd.google-apps.presentation': 'text/plain',
};

export class DriveRepository implements IDriveRepository {
  constructor(private readonly client: drive_v3.Drive) {}

  async listFiles(params: ListFilesParams): Promise<DriveFile[]> {
    const conditions: string[] = ['trashed = false'];

    if (params.folderId !== undefined) {
      conditions.push(`'${params.folderId}' in parents`);
    }
    if (params.mimeType !== undefined) {
      conditions.push(`mimeType = '${params.mimeType}'`);
    }

    const res = await this.client.files.list({
      q: conditions.join(' and '),
      pageSize: params.pageSize,
      fields: LIST_FIELDS,
    });

    return (res.data.files ?? []).map(mapToDriveFile);
  }

  async getFileContent(fileId: string): Promise<Buffer> {
    const meta = await this.client.files.get({ fileId, fields: 'mimeType' });
    const mimeType = meta.data.mimeType ?? '';

    if (mimeType.startsWith('application/vnd.google-apps.')) {
      // Google Workspace files must be exported, not downloaded directly
      const exportMime = EXPORT_MIME_MAP[mimeType] ?? 'text/plain';
      const res = await this.client.files.export(
        { fileId, mimeType: exportMime },
        { responseType: 'arraybuffer' }
      );
      return Buffer.from(res.data as ArrayBuffer);
    }

    const res = await this.client.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    if (res.data == null) {
      throw new FileNotFoundError(fileId);
    }

    return Buffer.from(res.data as ArrayBuffer);
  }

  async uploadFile(params: UploadParams): Promise<DriveFile> {
    const metadata: drive_v3.Schema$File = { name: params.name };

    if (params.folderId !== undefined) {
      metadata.parents = [params.folderId];
    }

    const res = await this.client.files.create({
      requestBody: metadata,
      media: {
        mimeType: params.mimeType,
        body: Readable.from(params.content),
      },
      fields: FILE_FIELDS,
    });

    if (res.data == null) {
      throw new UploadError(`Upload failed for file: ${params.name}`);
    }

    return mapToDriveFile(res.data);
  }

  async searchFiles(params: SearchParams): Promise<DriveFile[]> {
    const res = await this.client.files.list({
      q: `(${params.query}) and trashed = false`,
      pageSize: params.pageSize,
      fields: LIST_FIELDS,
    });

    return (res.data.files ?? []).map(mapToDriveFile);
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.client.files.delete({ fileId });
  }
}
