export class FfmpegNotInstalledError extends Error {
  constructor(detail?: string) {
    super(
      detail ??
        'ffmpeg/ffprobe is not installed or not found in PATH. ' +
          'Install it from https://ffmpeg.org/download.html and ensure it is available as a system command.'
    );
    this.name = 'FfmpegNotInstalledError';
  }
}
