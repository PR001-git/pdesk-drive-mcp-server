import type { IDriveRepository } from '../interfaces/drive-repository.interface.js';
import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { ISpeechRepository } from '../interfaces/speech-repository.interface.js';
import type { DriveFile } from '../models/drive-file.model.js';
import type { ListFilesParams } from '../models/list-params.model.js';
import type { ListRecordingsParams } from '../models/list-recordings-params.model.js';
import type { SearchParams } from '../models/search-params.model.js';
import type { Transcript } from '../models/transcript.model.js';
import type { Transcription } from '../models/transcription.model.js';
import type { UploadParams } from '../models/upload-params.model.js';

export class DriveService implements IDriveService {
  constructor(
    private readonly repo: IDriveRepository,
    private readonly speechRepo: ISpeechRepository
  ) {}

  async listFiles(params: ListFilesParams): Promise<DriveFile[]> {
    return this.repo.listFiles(params);
  }

  async listRecordings(params: ListRecordingsParams): Promise<DriveFile[]> {
    return this.repo.listRecordings(params);
  }

  async readFile(fileId: string): Promise<{ content: string; encoding: 'utf-8' | 'base64' }> {
    const buffer = await this.repo.getFileContent(fileId);

    // Heuristic: if the buffer contains a null byte, treat it as binary (base64)
    if (buffer.includes(0)) {
      return { content: buffer.toString('base64'), encoding: 'base64' };
    }

    return { content: buffer.toString('utf-8'), encoding: 'utf-8' };
  }

  async getTranscript(recordingFileId: string): Promise<Transcript> {
    const transcriptFile = await this.repo.findTranscript(recordingFileId);
    const buffer = await this.repo.getFileContent(transcriptFile.id);
    return { transcriptFileId: transcriptFile.id, content: buffer.toString('utf-8') };
  }

  async transcribeRecording(fileId: string, languageCode: string): Promise<Transcription> {
    const [audio, mimeType] = await Promise.all([
      this.repo.getFileContent(fileId),
      this.repo.getFileMimeType(fileId),
    ]);
    const text = await this.speechRepo.transcribe({ audio, mimeType, languageCode });
    return { fileId, text };
  }

  async uploadFile(params: UploadParams): Promise<DriveFile> {
    return this.repo.uploadFile(params);
  }

  async searchFiles(params: SearchParams): Promise<DriveFile[]> {
    return this.repo.searchFiles(params);
  }

  async deleteFile(fileId: string): Promise<void> {
    return this.repo.deleteFile(fileId);
  }
}
