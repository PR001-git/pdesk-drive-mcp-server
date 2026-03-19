import { execFile } from 'node:child_process';
import { readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

import type { ISpeechRepository } from '../interfaces/speech-repository.interface.js';
import type { ProgressCallback, TranscribeParams } from '../models/transcribe-params.model.js';
import { TranscriptionFailedError } from '../errors/transcription-failed.error.js';
import { Logger } from '../logger/index.js';

// 30 minutes — protects against corrupt audio that hangs Whisper
const PROCESS_TIMEOUT_MS = 30 * 60_000;

// Progress reporting interval while Whisper is running
const PROGRESS_INTERVAL_MS = 5_000;

// Maps MIME types to file extensions so Whisper can identify the format.
// Whisper auto-detects codec from the file, but needs a sensible extension.
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
 * Whisper expects ISO 639-1 codes (e.g. "en"), not full locale tags
 * like "en-US" that the Google Speech API accepted.
 */
function toWhisperLanguage(languageCode: string): string {
  return languageCode.split('-')[0]!.toLowerCase();
}

function fileExtensionForMime(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? '.audio';
}

export class WhisperRepository implements ISpeechRepository {
  private readonly logger = new Logger('WhisperRepository');

  constructor(private readonly whisperPath: string) {}

  async transcribe(params: TranscribeParams): Promise<string> {
    const ext = fileExtensionForMime(params.mimeType);
    const sizeMb = (params.audio.byteLength / (1024 * 1024)).toFixed(2);
    this.logger.log(`transcribe — ${sizeMb} MB ext=${ext} lang=${params.languageCode}`);

    const sessionId = randomUUID();
    const inputPath = join(tmpdir(), `whisper-in-${sessionId}${ext}`);
    const outputDir = join(tmpdir(), `whisper-out-${sessionId}`);

    await mkdir(outputDir, { recursive: true });
    await writeFile(inputPath, params.audio);

    try {
      const text = await this.runWhisper(
        inputPath,
        outputDir,
        params.languageCode,
        params.onProgress
      );

      if (text.trim().length === 0) {
        throw new TranscriptionFailedError('No speech detected in the audio.');
      }

      return text.trim();
    } finally {
      await rm(inputPath, { force: true });
      await rm(outputDir, { recursive: true, force: true });
    }
  }

  private async runWhisper(
    inputPath: string,
    outputDir: string,
    languageCode: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    const language = toWhisperLanguage(languageCode);
    const args = [
      inputPath,
      '--language', language,
      '--output_format', 'txt',
      '--output_dir', outputDir,
      '--model', 'tiny',
      '--device','cpu'
    ];

    this.logger.log(`Running: ${this.whisperPath} ${args.join(' ')}`);

    const text = await this.execWithProgress(
      this.whisperPath,
      args,
      onProgress
    );

    // If execWithProgress returns early (shouldn't happen), fall back to
    // reading the output file.
    if (text !== undefined) {
      return text;
    }

    return this.readOutputFile(inputPath, outputDir);
  }

  /**
   * Runs Whisper as a subprocess with time-based progress reporting.
   *
   * Whisper CLI does not emit structured progress, so we report estimated
   * milestones on a timer. This keeps the MCP client's timeout from
   * expiring during long transcriptions.
   */
  private execWithProgress(
    binary: string,
    args: string[],
    onProgress?: ProgressCallback
  ): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      const child = execFile(
        binary,
        args,
        { timeout: PROCESS_TIMEOUT_MS, maxBuffer: 50 * 1024 * 1024 },
        (err, _stdout, stderr) => {
          clearInterval(progressTimer);

          if (err !== null) {
            const msg = err.message.toLowerCase();

            if (msg.includes('enoent') || msg.includes('spawn')) {
              reject(new TranscriptionFailedError(
                'Whisper binary not found. Ensure openai-whisper is installed: pip install openai-whisper'
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
              `Whisper process failed: ${stderr || err.message}`
            ));
            return;
          }

          // Process completed — the output file holds the transcript
          resolve(undefined);
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

  private async readOutputFile(inputPath: string, outputDir: string): Promise<string> {
    // Whisper names the output file after the input: input.mp3 → input.txt
    const inputBase = basename(inputPath);
    const dotIndex = inputBase.lastIndexOf('.');
    const stem = dotIndex > 0 ? inputBase.slice(0, dotIndex) : inputBase;
    const outputPath = join(outputDir, `${stem}.txt`);

    try {
      return await readFile(outputPath, 'utf-8');
    } catch {
      throw new TranscriptionFailedError(
        'Whisper completed but no output file was produced. ' +
        'The audio may contain no recognisable speech.'
      );
    }
  }
}
