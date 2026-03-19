/** Callback invoked to report progress during long-running transcription. */
export type ProgressCallback = (progress: number, total: number, message: string) => void;

export interface TranscribeParams {
  audio: Buffer;
  mimeType: string;
  languageCode: string;
  onProgress?: ProgressCallback;
}
