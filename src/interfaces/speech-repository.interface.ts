import type { TranscribeParams } from '../models/transcribe-params.model.js';

export interface ISpeechRepository {
  transcribe(params: TranscribeParams): Promise<string>;
}
