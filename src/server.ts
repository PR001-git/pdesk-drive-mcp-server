import { createServer } from 'node:http';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { buildAuthUrl, createOAuth2Client } from './auth/oauth.client.js';
import { TokenStore } from './auth/token.store.js';
import { createDriveClient } from './drive/drive.client.js';
import { DriveRepository } from './drive/drive.repository.js';
import { DriveAuthError } from './errors/drive-auth.error.js';
import { createGithubClient } from './github/github.client.js';
import { GithubRepository } from './github/github.repository.js';
import { createNpmClient } from './npm/npm.client.js';
import { NpmRepository } from './npm/npm.repository.js';
import { DocsService } from './services/docs.service.js';
import { DriveService } from './services/drive.service.js';
import { createSpeechClient } from './speech/speech.client.js';
import { SpeechRepository } from './speech/speech.repository.js';
import { registerAllTools } from './tools/registry/tool-registry.js';

async function waitForOAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const httpServer = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost:3000');
      const code = url.searchParams.get('code');

      if (code === null) {
        res.writeHead(400);
        res.end('Missing authorization code.');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization successful. You can close this tab.</h1>');
      httpServer.close();
      resolve(code);
    });

    httpServer.on('error', reject);
    httpServer.listen(3000);
  });
}

async function runOAuthFlow(tokenStore: TokenStore): Promise<void> {
  const client = createOAuth2Client();
  const authUrl = buildAuthUrl(client);

  // Use stderr so the MCP JSON-RPC channel on stdout is not polluted
  process.stderr.write(`\nOpen this URL in your browser to authorize the application:\n${authUrl}\n\n`);

  const code = await waitForOAuthCode();
  const { tokens } = await client.getToken(code);
  await tokenStore.save(tokens);
}

async function main(): Promise<void> {
  const tokenStore = new TokenStore();
  let credentials = await tokenStore.load();

  if (credentials === null) {
    await runOAuthFlow(tokenStore);
    credentials = await tokenStore.load();
  }

  if (credentials === null) {
    throw new DriveAuthError('Could not obtain OAuth credentials after authorization flow.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(credentials);

  // Auto-persist refreshed access tokens so the server stays alive without re-auth
  oauth2Client.on('tokens', async (newTokens) => {
    const merged = { ...credentials, ...newTokens };
    await tokenStore.save(merged);
    credentials = merged;
  });

  const driveClient = createDriveClient(oauth2Client);
  const speechClient = createSpeechClient(oauth2Client);
  const repository = new DriveRepository(driveClient);
  const speechRepository = new SpeechRepository(speechClient, oauth2Client);
  const driveService = new DriveService(repository, speechRepository);

  const npmRepository = new NpmRepository(createNpmClient());
  const githubRepository = new GithubRepository(createGithubClient());
  const docsService = new DocsService(npmRepository, githubRepository);

  const server = new McpServer({ name: 'drive-mcp-server', version: '1.0.0' });
  registerAllTools(server, driveService, docsService);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal error: ${message}\n`);
});
