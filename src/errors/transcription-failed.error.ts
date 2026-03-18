export class TranscriptionFailedError extends Error {
  constructor(reason: string) {
    super(`Transcription failed: ${reason}`);
    this.name = 'TranscriptionFailedError';
  }
}
