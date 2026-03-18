import { Readable } from 'node:stream';

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { speech_v1 } from 'googleapis';

import type { ISpeechRepository } from '../interfaces/speech-repository.interface.js';
import type { TranscribeParams } from '../models/transcribe-params.model.js';
import { TranscriptionFailedError } from '../errors/transcription-failed.error.js';

// Maximum inline audio size for the Speech-to-Text API (10 MB)
const MAX_INLINE_BYTES = 10 * 1024 * 1024;

// Poll interval and timeout for long-running operations (ms)
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 10 * 60_000;

// Maps audio MIME types to Speech-to-Text encoding enum values.
// Video containers (mp4, mkv) are not supported — audio must be extracted first.
const MIME_TO_ENCODING: Record<string, string> = {
  'audio/wav': 'LINEAR16',
  'audio/x-wav': 'LINEAR16',
  'audio/flac': 'FLAC',
  'audio/x-flac': 'FLAC',
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'audio/ogg': 'OGG_OPUS',
  'audio/webm': 'WEBM_OPUS',
};

function resolveEncoding(mimeType: string): string {
  const encoding = MIME_TO_ENCODING[mimeType];

  if (encoding === undefined) {
    throw new TranscriptionFailedError(
      `Unsupported audio format: "${mimeType}". ` +
        'Supported formats: WAV, FLAC, MP3, OGG Opus, WebM Opus. ' +
        'For MP4/MKV recordings, extract the audio track first: ' +
        'ffmpeg -i recording.mp4 -vn -acodec libmp3lame recording.mp3'
    );
  }

  return encoding;
}

function extractTranscript(response: speech_v1.Schema$SpeechRecognitionResult[]): string {
  return response
    .flatMap((r) => r.alternatives ?? [])
    .map((a) => a.transcript ?? '')
    .join(' ')
    .trim();
}

export class SpeechRepository implements ISpeechRepository {
  constructor(
    private readonly client: speech_v1.Speech,
    private readonly auth: OAuth2Client
  ) {}

  async transcribe(params: TranscribeParams): Promise<string> {
    const encoding = resolveEncoding(params.mimeType);
    const config: speech_v1.Schema$RecognitionConfig = {
      encoding,
      languageCode: params.languageCode,
      enableAutomaticPunctuation: true,
    };

    if (params.audio.byteLength <= MAX_INLINE_BYTES) {
      return this.transcribeInline(params.audio, config);
    }

    return this.transcribeViaGcs(params.audio, config);
  }

  private async transcribeInline(
    audio: Buffer,
    config: speech_v1.Schema$RecognitionConfig
  ): Promise<string> {
    const res = await this.client.speech.recognize({
      requestBody: {
        config,
        audio: { content: audio.toString('base64') },
      },
    });

    const results = res.data.results ?? [];
    const text = extractTranscript(results);

    if (text.length === 0) {
      throw new TranscriptionFailedError('No speech detected in the audio.');
    }

    return text;
  }

  private async transcribeViaGcs(
    audio: Buffer,
    config: speech_v1.Schema$RecognitionConfig
  ): Promise<string> {
    const bucket = process.env['GOOGLE_CLOUD_BUCKET'];

    if (bucket === undefined || bucket === '') {
      throw new TranscriptionFailedError(
        'Audio file exceeds the 10 MB inline limit. ' +
          'Set the GOOGLE_CLOUD_BUCKET environment variable to enable large-file transcription via GCS.'
      );
    }

    const objectName = `transcription-tmp/${Date.now()}-${Math.random().toString(36).slice(2)}.audio`;
    const gcsUri = `gs://${bucket}/${objectName}`;
    const storage = google.storage({ version: 'v1', auth: this.auth });

    // Upload to GCS
    await storage.objects.insert({
      bucket,
      name: objectName,
      media: { body: Readable.from(audio) },
      requestBody: { name: objectName },
    });

    try {
      const operationRes = await this.client.speech.longrunningrecognize({
        requestBody: {
          config,
          audio: { uri: gcsUri },
        },
      });

      const operationName = operationRes.data.name;
      if (operationName === undefined || operationName === null) {
        throw new TranscriptionFailedError('Speech-to-Text operation returned no name.');
      }

      const results = await this.pollOperation(operationName);
      const text = extractTranscript(results);

      if (text.length === 0) {
        throw new TranscriptionFailedError('No speech detected in the audio.');
      }

      return text;
    } finally {
      // Always clean up the temporary GCS object
      await storage.objects.delete({ bucket, object: objectName }).catch(() => undefined);
    }
  }

  private async pollOperation(
    operationName: string
  ): Promise<speech_v1.Schema$SpeechRecognitionResult[]> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);

      const res = await this.client.operations.get({ name: operationName });

      if (res.data.done === true) {
        const error = res.data.error;
        if (error !== null && error !== undefined) {
          throw new TranscriptionFailedError(error.message ?? 'Unknown Speech-to-Text error.');
        }

        const response = res.data.response as
          | { results?: speech_v1.Schema$SpeechRecognitionResult[] }
          | undefined;

        return response?.results ?? [];
      }
    }

    throw new TranscriptionFailedError('Transcription timed out after 10 minutes.');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
