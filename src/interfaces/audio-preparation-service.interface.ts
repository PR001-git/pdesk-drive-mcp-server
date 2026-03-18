import type { AudioPreparationResult } from '../models/audio-preparation-result.model.js';

export interface IAudioPreparationService {
  /**
   * Returns true when the given MIME type is natively supported by the
   * transcription provider and requires no conversion.
   */
  isSupported(mimeType: string): boolean;

  /**
   * Ensures the file at `filePath` is in a format the transcription provider
   * accepts. If already supported, returns the original path unchanged.
   * Otherwise extracts the audio track and converts it to MP3, writing the
   * result to a system temp file.
   *
   * When `result.wasConverted` is true the caller owns the temp file and must
   * delete it after use.
   *
   * @throws {FfmpegNotInstalledError} when ffmpeg/ffprobe is not in PATH
   * @throws {NoAudioStreamError} when the file contains no audio track
   * @throws {AudioConversionError} when ffmpeg fails during conversion
   */
  prepare(filePath: string, mimeType: string): Promise<AudioPreparationResult>;
}
