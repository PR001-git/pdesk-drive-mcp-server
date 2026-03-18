import type { IDriveRepository } from '../interfaces/drive-repository.interface.js';
import type { IDriveService } from '../interfaces/drive-service.interface.js';
import type { DriveFile } from '../models/drive-file.model.js';
import type { ListFilesParams } from '../models/list-params.model.js';
import type { SearchParams } from '../models/search-params.model.js';
import type { UploadParams } from '../models/upload-params.model.js';

export class DriveService implements IDriveService {
  constructor(private readonly repo: IDriveRepository) {}

  async listFiles(params: ListFilesParams): Promise<DriveFile[]> {
    return this.repo.listFiles(params);
  }

  async readFile(fileId: string): Promise<{ content: string; encoding: 'utf-8' | 'base64' }> {
    const buffer = await this.repo.getFileContent(fileId);

    // Heuristic: if the buffer contains a null byte, treat it as binary (base64)
    if (buffer.includes(0)) {
      return { content: buffer.toString('base64'), encoding: 'base64' };
    }

    return { content: buffer.toString('utf-8'), encoding: 'utf-8' };
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
