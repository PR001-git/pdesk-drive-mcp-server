import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { drive_v3 } from 'googleapis';

export function createDriveClient(auth: OAuth2Client): drive_v3.Drive {
  return google.drive({ version: 'v3', auth });
}
