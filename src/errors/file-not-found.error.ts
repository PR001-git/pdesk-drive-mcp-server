export class FileNotFoundError extends Error {
  constructor(fileId: string) {
    super(`File not found: ${fileId}`);
    this.name = 'FileNotFoundError';
  }
}
