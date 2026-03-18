import type { DriveFile } from '../models/drive-file.model.js';
import type { ListFilesParams } from '../models/list-params.model.js';
import type { ListRecordingsParams } from '../models/list-recordings-params.model.js';
import type { SearchParams } from '../models/search-params.model.js';
import type { Transcript } from '../models/transcript.model.js';
import type { UploadParams } from '../models/upload-params.model.js';

import type { Transcription } from '../models/transcription.model.js';

export interface IDriveService {
  listFiles(params: ListFilesParams): Promise<DriveFile[]>;
  listRecordings(params: ListRecordingsParams): Promise<DriveFile[]>;
  readFile(fileId: string): Promise<{ content: string; encoding: 'utf-8' | 'base64' }>;
  getTranscript(recordingFileId: string): Promise<Transcript>;
  transcribeRecording(fileId: string, languageCode: string): Promise<Transcription>;
  uploadFile(params: UploadParams): Promise<DriveFile>;
  searchFiles(params: SearchParams): Promise<DriveFile[]>;
  deleteFile(fileId: string): Promise<void>;
}
