import type { DriveFile } from '../models/drive-file.model.js';
import type { ListFilesParams } from '../models/list-params.model.js';
import type { SearchParams } from '../models/search-params.model.js';
import type { UploadParams } from '../models/upload-params.model.js';

export interface IDriveService {
  listFiles(params: ListFilesParams): Promise<DriveFile[]>;
  readFile(fileId: string): Promise<{ content: string; encoding: 'utf-8' | 'base64' }>;
  uploadFile(params: UploadParams): Promise<DriveFile>;
  searchFiles(params: SearchParams): Promise<DriveFile[]>;
  deleteFile(fileId: string): Promise<void>;
}
