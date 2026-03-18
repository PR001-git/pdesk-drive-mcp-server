import type { DriveFile } from '../models/drive-file.model.js';
import type { ListFilesParams } from '../models/list-params.model.js';
import type { SearchParams } from '../models/search-params.model.js';
import type { UploadParams } from '../models/upload-params.model.js';

export interface IDriveRepository {
  listFiles(params: ListFilesParams): Promise<DriveFile[]>;
  getFileContent(fileId: string): Promise<Buffer>;
  uploadFile(params: UploadParams): Promise<DriveFile>;
  searchFiles(params: SearchParams): Promise<DriveFile[]>;
  deleteFile(fileId: string): Promise<void>;
}
