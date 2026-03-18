import { OAuth2Client } from 'google-auth-library';

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  // Required for Google Cloud Speech-to-Text and GCS (large-file transcription)
  'https://www.googleapis.com/auth/cloud-platform',
];

export function createOAuth2Client(): OAuth2Client {
  const clientId = process.env['GOOGLE_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];

  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required.'
    );
  }

  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: 'http://localhost:3000/oauth2callback',
  });
}

export function buildAuthUrl(client: OAuth2Client): string {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    // Force consent screen every time to ensure a refresh_token is returned
    prompt: 'consent',
  });
}
