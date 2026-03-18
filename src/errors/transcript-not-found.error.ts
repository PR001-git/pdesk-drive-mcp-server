export class TranscriptNotFoundError extends Error {
  constructor(recordingFileId: string) {
    super(`No transcript found for recording: ${recordingFileId}`);
    this.name = 'TranscriptNotFoundError';
  }
}