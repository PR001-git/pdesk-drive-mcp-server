import { execFile } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ISpeechRepository } from '../interfaces/speech-repository.interface.js';
import type { ProgressCallback, TranscribeParams } from '../models/transcribe-params.model.js';
import { TranscriptionFailedError } from '../errors/transcription-failed.error.js';
import { Logger } from '../logger/index.js';

// 30 minutes — protects against corrupt audio that hangs the process
const PROCESS_TIMEOUT_MS = 30 * 60_000;

// Progress reporting interval while transcription is running
const PROGRESS_INTERVAL_MS = 5_000;

// Maps MIME types to file extensions so faster-whisper can identify the format.
const MIME_TO_EXT: Record<string, string> = {
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
};

/**
 * Extracts the base language code from a BCP-47 locale tag.
 * faster-whisper expects ISO 639-1 codes (e.g. "en"), not full locale tags
 * like "en-US".
 */
function toWhisperLanguage(languageCode: string): string {
  return languageCode.split('-')[0]!.toLowerCase();
}

function fileExtensionForMime(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? '.audio';
}

export class FasterWhisperRepository implements ISpeechRepository {
  private readonly logger = new Logger('FasterWhisperRepository');

  constructor(
    private readonly pythonPath: string,
    private readonly runnerPath: string
  ) {}

  async transcribe(params: TranscribeParams): Promise<string> {
    const ext = fileExtensionForMime(params.mimeType);
    const sizeMb = (params.audio.byteLength / (1024 * 1024)).toFixed(2);
    this.logger.log(`transcribe — ${sizeMb} MB ext=${ext} lang=${params.languageCode}`);

    const sessionId = randomUUID();
    const inputPath = join(tmpdir(), `whisper-in-${sessionId}${ext}`);

    await writeFile(inputPath, params.audio);

    try {
      const text = await this.runFasterWhisper(
        inputPath,
        params.languageCode,
        params.onProgress
      );

      if (text.trim().length === 0) {
        throw new TranscriptionFailedError('No speech detected in the audio.');
      }

      return text.trim();
    } finally {
      await rm(inputPath, { force: true });
    }
  }

  private async runFasterWhisper(
    inputPath: string,
    languageCode: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    const language = toWhisperLanguage(languageCode);
    const args = [
      this.runnerPath,
      'tiny',
      'cpu',
      language,
      inputPath,
    ];

    this.logger.log(`Running: ${this.pythonPath} ${args.join(' ')}`);

    return this.execWithProgress(this.pythonPath, args, onProgress);
  }

  /**
   * Runs faster-whisper via the Python runner script with time-based progress
   * reporting.
   *
   * The runner prints the transcript to stdout. Progress is estimated on a
   * timer since faster-whisper does not emit structured progress events.
   * This keeps the MCP client's timeout from expiring during long
   * transcriptions.
   */
  private execWithProgress(
    binary: string,
    args: string[],
    onProgress?: ProgressCallback
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = execFile(
        binary,
        args,
        { timeout: PROCESS_TIMEOUT_MS, maxBuffer: 50 * 1024 * 1024 },
        (err, stdout, stderr) => {
          clearInterval(progressTimer);

          if (err !== null) {
            const msg = err.message.toLowerCase();

            if (msg.includes('enoent') || msg.includes('spawn')) {
              reject(new TranscriptionFailedError(
                'Python binary not found. Ensure Python is installed and faster-whisper is available: pip install faster-whisper'
              ));
              return;
            }

            if (msg.includes('killed') || msg.includes('timeout')) {
              reject(new TranscriptionFailedError(
                'Transcription timed out after 30 minutes. The audio file may be corrupt or extremely long.'
              ));
              return;
            }

            reject(new TranscriptionFailedError(
              `faster-whisper process failed: ${stderr || err.message}`
            ));
            return;
          }

          resolve(stdout);
        }
      );

      // Time-based progress: report milestones every PROGRESS_INTERVAL_MS
      let elapsed = 0;
      const progressTimer = setInterval(() => {
        elapsed += PROGRESS_INTERVAL_MS;
        const elapsedSec = Math.round(elapsed / 1000);

        // Report on a 0-100 scale; cap at 95 so "100" only comes on completion
        const estimatedProgress = Math.min(95, Math.round(elapsed / 1000));
        onProgress?.(estimatedProgress, 100, `Transcribing audio… ${elapsedSec}s elapsed`);
      }, PROGRESS_INTERVAL_MS);

      // Ensure timer is cleaned up if the child process is killed externally
      child.on('close', () => clearInterval(progressTimer));
    });
  }
}
