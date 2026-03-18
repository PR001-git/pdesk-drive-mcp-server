/**
 * Local test client for the Drive MCP server.
 *
 * Usage:
 *   node --env-file=.env test-client.mjs
 *   node --env-file=.env test-client.mjs list
 *   node --env-file=.env test-client.mjs search "name contains 'report'"
 *   node --env-file=.env test-client.mjs read <fileId>
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const COMMAND = 'node';
const ARGS = ['--env-file=.env', 'dist/server.js'];

async function connect() {
  const transport = new StdioClientTransport({ command: COMMAND, args: ARGS });
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(transport);
  return client;
}

async function listTools(client) {
  const { tools } = await client.listTools();
  console.log('\n=== Available Tools ===');
  for (const tool of tools) {
    console.log(`\n• ${tool.name}`);
    console.log(`  ${tool.description}`);
  }
}

async function callTool(client, name, args) {
  console.log(`\n=== Calling ${name} ===`);
  console.log('Input:', JSON.stringify(args, null, 2));

  const result = await client.callTool({ name, arguments: args });

  if (result.isError) {
    console.error('Error:', result.content[0]?.text);
  } else {
    console.log('Result:', result.content[0]?.text);
  }
}

async function main() {
  const [, , command, ...rest] = process.argv;
  const client = await connect();

  try {
    switch (command) {
      case 'tools':
        await listTools(client);
        break;

      case 'list':
        await callTool(client, 'drive_list_files', {
          pageSize: 10,
          ...(rest[0] ? { folderId: rest[0] } : {}),
        });
        break;

      case 'search':
        await callTool(client, 'drive_search_files', {
          query: rest[0] ?? "name contains 'test'",
          pageSize: 10,
        });
        break;

      case 'read':
        if (!rest[0]) { console.error('Usage: read <fileId>'); process.exit(1); }
        await callTool(client, 'drive_read_file', { fileId: rest[0] });
        break;

      case 'delete':
        if (!rest[0]) { console.error('Usage: delete <fileId>'); process.exit(1); }
        await callTool(client, 'drive_delete_file', { fileId: rest[0] });
        break;

      default:
        // No command: list tools then do a quick drive_list_files smoke test
        await listTools(client);
        console.log('\n=== Smoke test: drive_list_files (pageSize: 5) ===');
        await callTool(client, 'drive_list_files', { pageSize: 5 });
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
