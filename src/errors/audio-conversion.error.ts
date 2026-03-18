export class AudioConversionError extends Error {
  constructor(reason: string) {
    super(`Audio conversion failed: ${reason}`);
    this.name = 'AudioConversionError';
  }
}
