export interface AudioPreparationResult {
  /** Absolute path to the audio file ready for transcription. */
  filePath: string;
  /** MIME type of the output file (may differ from input if converted). */
  mimeType: string;
  /**
   * True when a new temp file was created by conversion.
   * Callers are responsible for deleting it when done.
   */
  wasConverted: boolean;
}
