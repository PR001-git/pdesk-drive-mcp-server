import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Credentials } from 'google-auth-library';

import type { ITokenStore } from '../interfaces/token-store.interface.js';

const TOKEN_PATH = join(process.cwd(), 'tokens.json');

export class TokenStore implements ITokenStore {
  async load(): Promise<Credentials | null> {
    try {
      const raw = await readFile(TOKEN_PATH, 'utf-8');
      return JSON.parse(raw) as Credentials;
    } catch (err) {
      // File not found is expected on first run — anything else is a real problem
      if (isFileNotExistError(err)) return null;
      throw err;
    }
  }

  async save(credentials: Credentials): Promise<void> {
    await writeFile(TOKEN_PATH, JSON.stringify(credentials, null, 2), 'utf-8');
  }
}

function isFileNotExistError(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
}
