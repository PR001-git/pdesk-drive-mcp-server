import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { speech_v1 } from 'googleapis';

export function createSpeechClient(auth: OAuth2Client): speech_v1.Speech {
  return google.speech({ version: 'v1', auth });
}
