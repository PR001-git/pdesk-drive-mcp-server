import type { DriveFile } from '../models/drive-file.model.js';
import type { ListFilesParams } from '../models/list-params.model.js';
import type { ListRecordingsParams } from '../models/list-recordings-params.model.js';
import type { SearchParams } from '../models/search-params.model.js';
import type { UploadParams } from '../models/upload-params.model.js';

export interface IDriveRepository {
  listFiles(params: ListFilesParams): Promise<DriveFile[]>;
  listRecordings(params: ListRecordingsParams): Promise<DriveFile[]>;
  getFileContent(fileId: string): Promise<Buffer>;
  getFileMimeType(fileId: string): Promise<string>;
  findTranscript(recordingFileId: string): Promise<DriveFile>;
  uploadFile(params: UploadParams): Promise<DriveFile>;
  searchFiles(params: SearchParams): Promise<DriveFile[]>;
  deleteFile(fileId: string): Promise<void>;
}
