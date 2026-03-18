import { readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { IAudioPreparationService } from '../interfaces/audio-preparation-service.interface.js';
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
    private readonly speechRepo: ISpeechRepository,
    private readonly audioPrep: IAudioPreparationService
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

    const prepared = await this.prepareAudioBuffer(audio, mimeType);

    try {
      const text = await this.speechRepo.transcribe({
        audio: prepared.audio,
        mimeType: prepared.mimeType,
        languageCode,
      });
      return { fileId, text };
    } finally {
      // Clean up the converted temp file; the input temp file is already
      // removed inside prepareAudioBuffer.
      if (prepared.tempPath !== undefined) {
        await rm(prepared.tempPath, { force: true });
      }
    }
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

  // ─── Private ───────────────────────────────────────────────────────────────

  /**
   * Bridges the Buffer-based Drive layer with the file-path-based
   * AudioPreparationService. When the MIME type is already supported the
   * buffer is returned as-is with no file I/O. Otherwise it is written to a
   * temp file, converted, and read back — both temp files are cleaned up
   * before this method returns.
   */
  private async prepareAudioBuffer(
    audio: Buffer,
    mimeType: string
  ): Promise<{ audio: Buffer; mimeType: string; tempPath?: string }> {
    if (this.audioPrep.isSupported(mimeType)) {
      return { audio, mimeType };
    }

    const inputPath = join(tmpdir(), `drive-audio-in-${randomUUID()}`);
    await writeFile(inputPath, audio);

    try {
      const result = await this.audioPrep.prepare(inputPath, mimeType);
      const preparedAudio = await readFile(result.filePath);

      // result.filePath is a new temp file when wasConverted is true.
      // We hand tempPath back up to transcribeRecording for cleanup after
      // the Speech API call completes.
      return {
        audio: preparedAudio,
        mimeType: result.mimeType,
        ...(result.wasConverted ? { tempPath: result.filePath } : {}),
      };
    } finally {
      // The input temp file is no longer needed regardless of outcome.
      await rm(inputPath, { force: true });
    }
  }
}
