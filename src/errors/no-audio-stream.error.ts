export class NoAudioStreamError extends Error {
  constructor(filePath: string) {
    super(`No audio stream found in file: "${filePath}". The file may be video-only, corrupt, or an unsupported container.`);
    this.name = 'NoAudioStreamError';
  }
}
