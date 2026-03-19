export class WhisperNotInstalledError extends Error {
  constructor(detail?: string) {
    const base =
      'faster-whisper is not installed or Python was not found on PATH. ' +
      'Install it with: pip install faster-whisper';

    super(detail !== undefined ? `${base} (${detail})` : base);
    this.name = 'WhisperNotInstalledError';
  }
}
