export class WhisperNotInstalledError extends Error {
  constructor(detail?: string) {
    const base =
      'OpenAI Whisper is not installed or not found on PATH. ' +
      'Install it with: pip install openai-whisper';

    super(detail !== undefined ? `${base} (${detail})` : base);
    this.name = 'WhisperNotInstalledError';
  }
}
