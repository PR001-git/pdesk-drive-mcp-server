import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { IAudioPreparationService } from '../interfaces/audio-preparation-service.interface.js';
import type { AudioPreparationResult } from '../models/audio-preparation-result.model.js';
import type { FfmpegPaths } from './ffmpeg-resolver.js';
import { AudioConversionError } from '../errors/audio-conversion.error.js';
import { FfmpegNotInstalledError } from '../errors/ffmpeg-not-installed.error.js';
import { NoAudioStreamError } from '../errors/no-audio-stream.error.js';

const execFileAsync = promisify(execFile);

// ─── Supported MIME types ────────────────────────────────────────────────────
// Must stay in sync with MIME_TO_ENCODING in speech/speech.repository.ts.
// These formats are passed directly to the Speech-to-Text API without conversion.
const SUPPORTED_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/webm',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface FfprobeStream {
  codec_type?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
}

/**
 * Detects when ffmpeg/ffprobe is missing from PATH.
 * Node surfaces this as an ENOENT error from the spawn syscall.
 */
function isMissingBinaryError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('enoent') || msg.includes('spawn');
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AudioPreparationService implements IAudioPreparationService {
  constructor(private readonly paths: FfmpegPaths) {}

  isSupported(mimeType: string): boolean {
    return SUPPORTED_MIME_TYPES.has(mimeType);
  }

  async prepare(filePath: string, mimeType: string): Promise<AudioPreparationResult> {
    if (this.isSupported(mimeType)) {
      return { filePath, mimeType, wasConverted: false };
    }

    // Probe before converting: fail fast with a clear error when there is no
    // audio track rather than letting ffmpeg produce a silent empty file.
    await this.assertHasAudioStream(filePath);

    const outputPath = join(tmpdir(), `audio-prep-${randomUUID()}.mp3`);
    await this.convertToMp3(filePath, outputPath);

    return { filePath: outputPath, mimeType: 'audio/mpeg', wasConverted: true };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /**
   * Runs ffprobe on the file and throws if no audio stream is found.
   * This is cheaper than attempting a full conversion on a video-only file.
   *
   * Uses execFile (not exec) to avoid shell injection — file paths are passed
   * as array arguments, never interpolated into a command string.
   */
  private async assertHasAudioStream(filePath: string): Promise<void> {
    let stdout: string;

    try {
      const result = await execFileAsync(this.paths.ffprobe, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        filePath,
      ]);
      stdout = result.stdout;
    } catch (err: unknown) {
      if (isMissingBinaryError(err)) {
        throw new FfmpegNotInstalledError();
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new AudioConversionError(`ffprobe could not read "${filePath}": ${message}`);
    }

    const probe: FfprobeOutput = JSON.parse(stdout) as FfprobeOutput;
    const hasAudio = probe.streams?.some((s) => s.codec_type === 'audio') ?? false;

    if (!hasAudio) {
      throw new NoAudioStreamError(filePath);
    }
  }

  /**
   * Strips the video track and re-encodes the audio as 128 kbps MP3.
   * MP3 is chosen as the conversion target because it is universally
   * supported by the transcription provider and produces compact files.
   *
   * The -y flag overwrites the output without prompting (the path is a
   * unique temp file so there is no risk of overwriting user data).
   */
  private async convertToMp3(inputPath: string, outputPath: string): Promise<void> {
    try {
      await execFileAsync(this.paths.ffmpeg, [
        '-i', inputPath,
        '-vn',
        '-acodec', 'libmp3lame',
        '-ab', '128k',
        '-y',
        outputPath,
      ]);
    } catch (err: unknown) {
      if (isMissingBinaryError(err)) {
        throw new FfmpegNotInstalledError();
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new AudioConversionError(`ffmpeg conversion to MP3 failed: ${message}`);
    }
  }
}
